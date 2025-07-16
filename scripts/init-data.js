const fs = require('fs-extra')
const path = require('path')
const bcrypt = require('bcryptjs')

const DATA_DIR = path.join(__dirname, '../data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const RECORDS_FILE = path.join(DATA_DIR, 'records.json')

// 生成ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 生成随机日期
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// 初始化测试数据
const initTestData = async () => {
  try {
    // 确保数据目录存在
    await fs.ensureDir(DATA_DIR)
    
    // 创建测试用户
    const hashedPassword = await bcrypt.hash('123456', 10)
    const users = [
      {
        id: generateId(),
        username: 'test',
        password: hashedPassword,
        nickname: '测试用户',
        avatar: '',
        createdAt: new Date().toISOString()
      }
    ]
    
    // 创建测试记录
    const categories = {
      income: ['工资', '奖金', '投资', '兼职', '其他'],
      expense: ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '住房', '其他']
    }
    
    const records = []
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    
    // 生成收入记录
    for (let i = 0; i < 15; i++) {
      const date = randomDate(startDate, now)
      records.push({
        id: generateId(),
        userId: users[0].id,
        type: 'income',
        category: categories.income[Math.floor(Math.random() * categories.income.length)],
        amount: Math.floor(Math.random() * 5000) + 1000,
        remark: `测试收入记录 ${i + 1}`,
        date: date.toISOString().split('T')[0],
        createdAt: date.toISOString()
      })
    }
    
    // 生成支出记录
    for (let i = 0; i < 30; i++) {
      const date = randomDate(startDate, now)
      records.push({
        id: generateId(),
        userId: users[0].id,
        type: 'expense',
        category: categories.expense[Math.floor(Math.random() * categories.expense.length)],
        amount: Math.floor(Math.random() * 200) + 10,
        remark: `测试支出记录 ${i + 1}`,
        date: date.toISOString().split('T')[0],
        createdAt: date.toISOString()
      })
    }
    
    // 写入文件
    await fs.writeJson(USERS_FILE, users, { spaces: 2 })
    await fs.writeJson(RECORDS_FILE, records, { spaces: 2 })
    
    console.log('✅ 测试数据初始化成功！')
    console.log(`📁 用户数据: ${USERS_FILE}`)
    console.log(`📁 记录数据: ${RECORDS_FILE}`)
    console.log(`👤 测试用户: test / 123456`)
    console.log(`📊 生成记录: ${records.length} 条`)
    
  } catch (error) {
    console.error('❌ 初始化测试数据失败:', error)
    process.exit(1)
  }
}

// 运行初始化
if (require.main === module) {
  initTestData()
}

module.exports = { initTestData } 