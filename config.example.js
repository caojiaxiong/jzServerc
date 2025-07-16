module.exports = {
  // 服务器配置
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT配置
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: '7d',
  
  // 数据文件路径
  dataDir: './data',
  usersFile: './data/users.json',
  recordsFile: './data/records.json',
  
  // 跨域配置
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:3000'],
    credentials: true
  },
  
  // 文件上传配置
  upload: {
    path: './uploads',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
  }
} 