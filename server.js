
// 服务器
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: 'https://engaged-calf-22144.upstash.io',
  token: 'AVaAAAIjcDFmNzM1MzE3ODk2ZjA0OGJkOWNiZDk4N2Q4Yjg0NDQyYXAxMA',
});

const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fs = require('fs-extra')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = 'your-secret-key' // 在生产环境中应该使用环境变量

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const RECORDS_FILE = path.join(DATA_DIR, 'records.json')

// 中间件
// app.use(cors())
app.use(cors({
  origin: '*', // 改为你的前端域名
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 确保数据目录存在
fs.ensureDirSync(DATA_DIR)

// 初始化数据文件
const initDataFiles = () => {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeJsonSync(USERS_FILE, [])
  }
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeJsonSync(RECORDS_FILE, [])
  }
}

// 读取数据
const readUsers = async () => {
  try {
    // return fs.readJsonSync(USERS_FILE)
    const users = await redis.get("users"); // 返回 "value"
    // console.log(users, '获取数据库user');

    return users || []
  } catch (error) {
    console.log(error, '报错');

    return []
  }
}

const readRecords = async () => {
  try {
    // return fs.readJsonSync(RECORDS_FILE)

    const records = await redis.get("records"); // 返回 "value"
    return records || [];
  } catch (error) {
    return []
  }
}

// 写入数据
const writeUsers = async (users) => {
  // fs.writeJsonSync(USERS_FILE, users, { spaces: 2 })
  await redis.set("users", users);
}

const writeRecords = async (records) => {
  // fs.writeJsonSync(RECORDS_FILE, records, { spaces: 2 })
  await redis.set("records", records);
}

// 生成ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 验证Token中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供访问令牌' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '无效的访问令牌' })
    }
    req.user = user
    next()
  })
}
// 
const multer = require('multer');
// 图片
const cloudinary = require('cloudinary').v2
cloudinary.config({
  cloud_name: 'dws0bkxa2',
  api_key: '725946551722924',
  api_secret: '0eG4XL2EDl4YqMRTBNNxPeXRkD0' // Click 'View API Keys' above to copy your API secret
});
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), async (req, res) => {

  try {
    const fileBuffer = req.file.buffer;

    const result = await cloudinary.uploader.upload('data:image/png;base64,' + fileBuffer.toString('base64'), {
      resource_type: 'auto'
    });
    console.log('result', result.secure_url);

    res.json({
      url: result.secure_url,
      success: true,
      message: '上传成功',
    });
  } catch (error) {
    console.log(error, '报错');
    res.status(500).json({ error: 'Upload failed' });
  }

});

// 路由

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body

    if (!username || !password || !nickname) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的注册信息'
      })
    }

    const users = await readUsers()

    // 检查用户名是否已存在
    const existingUser = users.find(user => user.username === username)
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建新用户
    const newUser = {
      id: generateId(),
      username,
      password: hashedPassword,
      nickname,
      avatar: '',
      createdAt: new Date().toISOString()
    }

    users.push(newUser)
    writeUsers(users)

    res.json({
      success: true,
      message: '注册成功'
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供用户名和密码'
      })
    }

    const users = await readUsers()


    const user = users.find(u => u.username === username)

    if (!user) {
      return res.status(400).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user

    res.json({
      success: true,
      message: '登录成功',
      user: userInfo,
      token
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 获取用户信息
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const users = await readUsers()
    const user = users.find(u => u.id === req.user.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    const { password: _, ...userInfo } = user
    res.json({
      success: true,
      user: userInfo
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})



// 更新用户信息
app.put('/api/user/update', authenticateToken, async (req, res) => {
  try {
    const { nickname, avatar } = req.body
    const users = await readUsers()
    const userIndex = users.findIndex(u => u.id === req.user.userId)

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 更新用户信息
    if (nickname) users[userIndex].nickname = nickname
    if (avatar) {
      let s = avatar.toString('base64')
      console.log(s, 888);

      users[userIndex].avatar = avatar
    }
    writeUsers(users)
    const { password: _, ...userInfo } = users[userIndex]
    res.json({
      success: true,
      message: '更新成功',
      user: userInfo
    })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 获取记账记录
app.get('/api/records', authenticateToken, async (req, res) => {
  try {
    const records = await readRecords()
    const userRecords = records.filter(record => record.userId === req.user.userId)
    res.json({
      success: true,
      records: userRecords
    })
  } catch (error) {
    console.error('获取记录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 添加记账记录
app.post('/api/records', authenticateToken, async (req, res) => {
  try {
    const { type, category, amount, remark, date } = req.body

    if (!type || !category || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的记录信息'
      })
    }

    const records = await readRecords()
    const newRecord = {
      id: generateId(),
      userId: req.user.userId,
      type,
      category,
      amount: parseFloat(amount),
      remark: remark || '',
      date,
      createdAt: new Date().toISOString()
    }

    records.push(newRecord)
    writeRecords(records)

    res.json({
      success: true,
      message: '记录添加成功',
      record: newRecord
    })
  } catch (error) {
    console.error('添加记录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 更新记账记录
app.put('/api/records/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { type, category, amount, remark, date } = req.body

    const records = await readRecords()
    const recordIndex = records.findIndex(record =>
      record.id === id && record.userId === req.user.userId
    )

    if (recordIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      })
    }

    // 更新记录
    records[recordIndex] = {
      ...records[recordIndex],
      type,
      category,
      amount: parseFloat(amount),
      remark: remark || '',
      date,
      updatedAt: new Date().toISOString()
    }

    writeRecords(records)

    res.json({
      success: true,
      message: '记录更新成功',
      record: records[recordIndex]
    })
  } catch (error) {
    console.error('更新记录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 删除记账记录
app.delete('/api/records/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const records = await readRecords()
    const recordIndex = records.findIndex(record =>
      record.id === id && record.userId === req.user.userId
    )

    if (recordIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      })
    }

    records.splice(recordIndex, 1)
    writeRecords(records)

    res.json({
      success: true,
      message: '记录删除成功'
    })
  } catch (error) {
    console.error('删除记录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  })
})

// 404处理
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: '接口不存在'
//   })
// })

// app.get('/get', (req, res) => {
//   const { a } = req.query;
//   res.send(a);
// });
// app.get('/', (req, res) => {
//   // res.send('hello');
//   // const filePath = __dirname + '/public/pages/index.html';
//   const filePath = __dirname + '/h5/test.html';
//   res.sendFile(filePath);
// });
// 初始化数据文件
initDataFiles()



// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  console.log(`API文档: http://localhost:${PORT}/api/health`)
}) 