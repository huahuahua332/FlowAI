const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config({ path: './config.env' });

// 导入数据库连接
const { connectDB, getConnectionStatus, healthCheck, isDemoMode } = require('./config/database');

// 导入路由
const authRoutes = require('./routes/auth');
const generateRoutes = require('./routes/generate');
const userRoutes = require('./routes/user');
const paymentRoutes = require('./routes/payment');
const promptRoutes = require('./routes/prompt');
const adminRoutes = require('./routes/admin');


// 导入定时任务
const CronJobs = require('./jobs/cronJobs');

// 导入中间件
const { authenticateToken, optionalAuth, requireAdmin, rateLimitMiddleware, deviceFingerprintMiddleware } = require('./middleware/auth');
const i18nService = require('./services/i18nService');

const app = express();

// 设置 trust proxy（用于反向代理环境）
app.set('trust proxy', 1);

// 连接数据库
connectDB();

// 安全中间件 - 临时放宽CSP以调试JavaScript问题
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https:", "wss:"],
      frameSrc: ["'self'", "https://accounts.google.com", "https:"],
      childSrc: ["'self'", "https://accounts.google.com", "https:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
}));

// CORS 配置 - 针对React应用优化
app.use(cors({
  origin: function(origin, callback) {
    // 允许的域名列表 (HTTPS - 生产环境)
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://lbszbktvnuvn.sealoshzh.site',
      'https://lbszbktvnuvn.sealoshzh.site',  // 当前HTTPS服务器
      'http://localhost:3000',  // React默认开发端口
      'http://localhost:3001',  // 备用端口
      'http://localhost:5173',  // Vite默认端口
      'http://localhost:4173',  // Vite预览端口
      'http://localhost:8080',  // 其他常用端口
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://localhost:59334',
      'http://127.0.0.1:59334'
    ];
    
    // 开发环境允许所有localhost
    if (process.env.NODE_ENV === 'development') {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // 生产环境严格检查
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-creem-signature',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count'], // 用于分页
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 多语言中间件
app.use(i18nService.middleware());

// 设备指纹中间件
app.use(deviceFingerprintMiddleware);

// React应用常用的安全头
app.use((req, res, next) => {
  // 防止XSS攻击
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // React应用的CSP策略
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https: wss:; " +
      "frame-src 'self' https://accounts.google.com;"
    );
  }
  
  next();
});

// Session 配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 移除了Passport - 现在使用直接的OAuth实现

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // 修复trust proxy问题
  validate: {
    xForwardedForHeader: false // 禁用X-Forwarded-For验证
  }
});

app.use('/api/', limiter);

// 视频生成接口的特殊限制
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 每小时最多20次生成请求
  message: {
    success: false,
    message: '生成请求过于频繁，请稍后再试'
  },
  trustProxy: true, // 修复trust proxy问题
  validate: {
    xForwardedForHeader: false // 禁用X-Forwarded-For验证
  }
});

app.use('/api/generate', generateLimiter);

// 静态文件服务
app.use(express.static('public'));

// OAuth 调试页面
app.get('/oauth-debug', (req, res) => {
  res.sendFile(__dirname + '/public/oauth-debug.html');
});

// OAuth 配置诊断页面
app.get('/oauth-config-test', (req, res) => {
  res.sendFile(__dirname + '/public/oauth-config-test.html');
});

app.use('/api/auth', require('./routes/auth'));

// OAuth 测试页面 (兼容文档中的端点)
app.get('/oauth-test', (req, res) => {
  res.sendFile(__dirname + '/public/oauth-debug.html');
});

// 新的OAuth调试页面
app.get('/oauth-debug-new', (req, res) => {
  res.sendFile(__dirname + '/public/oauth-debug-new.html');
});

// 后台管理页面
app.get('/admin.html', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// 后台管理登录页面
app.get('/admin-login.html', (req, res) => {
  res.sendFile(__dirname + '/public/admin-login.html');
});

// 后台管理测试页面
app.get('/admin-test.html', (req, res) => {
  res.sendFile(__dirname + '/public/admin-test.html');
});



// 健康检查
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const connectionStatus = getConnectionStatus();
    
    res.json({
      success: true,
      message: '服务运行正常',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbHealth,
      connection: connectionStatus,
      mode: isDemoMode ? 'demo' : 'production'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error.message
    });
  }
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // 添加兼容路由
app.use('/api/generate', authenticateToken, generateRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/prompt', optionalAuth, promptRoutes);

// 管理员路由 - 需要管理员权限
app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes);

// 根路径
app.get('/', (req, res) => {
  const connectionStatus = getConnectionStatus();
  
  res.json({
    success: true,
    message: '视频生成后端服务',
    version: '1.0.0',
    mode: isDemoMode ? 'demo' : 'production',
    database: isDemoMode ? 'mock' : 'mongodb',
    supportedModels: ['veo-3', 'wan-i2v', 'wan-t2v'],
    endpoints: {
      auth: '/api/auth',
      generate: '/api/generate',
      user: '/api/user',
      payment: '/api/payment',
      prompt: '/api/prompt',
      health: '/health'
    },
    connection: connectionStatus
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('全局错误:', error);
  
  // Mongoose 验证错误
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors
    });
  }

  // Mongoose 重复键错误
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} 已存在`
    });
  }

  // JWT 错误
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的访问令牌'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '访问令牌已过期'
    });
  }

  // 默认错误
  res.status(error.status || 500).json({
    success: false,
    message: error.message || '服务器内部错误'
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  
  // 启动定时任务
  if (process.env.NODE_ENV !== 'test') {
    CronJobs.start();
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

module.exports = app; 