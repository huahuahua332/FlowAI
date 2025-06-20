const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './config.env' });

const app = express();

// 设置 trust proxy（用于反向代理环境）
app.set('trust proxy', 1);

// 安全中间件
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

// CORS 配置
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://lbszbktvnuvn.sealoshzh.site',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://localhost:59334',
      'http://127.0.0.1:59334'
    ];
    
    if (process.env.NODE_ENV === 'development') {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
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
  exposedHeaders: ['X-Total-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true // 添加这个选项
});

app.use('/api/', limiter);

// 静态文件服务
app.use(express.static('public'));

// 模拟用户数据
const mockUsers = {
  'demo_user': {
    _id: 'demo_user',
    name: '演示用户',
    email: 'demo@example.com',
    avatar: 'https://via.placeholder.com/100',
    subscriptionLevel: 'plus',
    points: 120,
    lastSigninDate: new Date().toISOString(),
    consecutiveSigninDays: 5,
    monthlySigninDays: 15,
    subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  }
};

// 模拟视频数据
const mockVideos = [
  {
    videoId: 'video_001',
    status: 'completed',
    videoUrl: 'https://example.com/video1.mp4',
    model: 'wan-t2v',
    prompt: '一只可爱的小猫在花园里玩耍',
    duration: 5,
    pointsUsed: 45,
    createdAt: new Date().toISOString()
  },
  {
    videoId: 'video_002',
    status: 'processing',
    progress: 75,
    model: 'veo-3',
    prompt: '科幻城市的未来景象',
    duration: 10,
    pointsUsed: 140,
    createdAt: new Date().toISOString()
  }
];

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常 (演示模式)',
    timestamp: new Date().toISOString(),
    version: '1.0.0-demo',
    database: 'mock'
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '视频生成后端服务 (演示模式)',
    version: '1.0.0-demo',
    supportedModels: ['veo-3', 'wan-i2v', 'wan-t2v'],
    endpoints: {
      auth: '/api/auth',
      generate: '/api/generate',
      user: '/api/user',
      payment: '/api/payment',
      health: '/health'
    },
    note: '这是演示模式，使用模拟数据'
  });
});

// 认证相关API (模拟)
app.get('/api/auth/google', (req, res) => {
  res.redirect('/auth/callback?success=true&token=demo_token_123&user=demo_user');
});

app.get('/auth/callback', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth 回调</title>
    </head>
    <body>
        <h2>登录成功 (演示模式)</h2>
        <p>Token: demo_token_123</p>
        <script>
            // 如果是弹窗登录
            if (window.opener) {
                window.opener.postMessage({
                    token: 'demo_token_123',
                    user: 'demo_user'
                }, '*');
                window.close();
            } else {
                // 直接跳转
                localStorage.setItem('authToken', 'demo_token_123');
                window.location.href = '/';
            }
        </script>
    </body>
    </html>
  `);
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }

  res.json({
    success: true,
    data: {
      user: mockUsers.demo_user
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 视频生成API (模拟)
app.post('/api/generate/video', (req, res) => {
  const { model, prompt, duration = 5, batchSize = 1 } = req.body;

  if (!model || !prompt) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数: model 和 prompt'
    });
  }

  // 模拟生成视频ID
  const videoIds = Array.from({ length: batchSize }, (_, i) => 
    `video_${Date.now()}_${i + 1}`
  );

  // 模拟积分消耗
  const pointsTable = {
    'wan-i2v': { 5: 22, 10: 32 },
    'wan-t2v': { 5: 45, 10: 65 },
    'veo-3': { 5: 70, 10: 140 }
  };
  
  const singlePoints = pointsTable[model]?.[duration] || 45;
  const pointsUsed = singlePoints * batchSize;

  res.json({
    success: true,
    data: {
      videoIds,
      batchSize,
      status: 'processing',
      message: `批量生成请求已提交，正在生成 ${batchSize} 个视频 (演示模式)`,
      model,
      pointsUsed
    }
  });
});

app.get('/api/generate/status/:videoId', (req, res) => {
  const { videoId } = req.params;
  
  // 模拟返回视频状态
  const mockVideo = mockVideos.find(v => v.videoId === videoId) || {
    videoId,
    status: 'completed',
    videoUrl: 'https://example.com/demo-video.mp4',
    progress: 100,
    model: 'wan-t2v',
    prompt: '演示视频',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: mockVideo
  });
});

app.get('/api/generate/history', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  res.json({
    success: true,
    data: {
      videos: mockVideos,
      pagination: {
        page,
        limit,
        total: mockVideos.length,
        pages: Math.ceil(mockVideos.length / limit)
      }
    }
  });
});

// 用户相关API (模拟)
app.post('/api/user/signin', (req, res) => {
  res.json({
    success: true,
    data: {
      pointsEarned: 7,
      consecutiveDays: 6,
      monthlyDays: 16,
      totalPoints: 127,
      bonusMessage: '即将获得连续7天奖励！',
      message: '签到成功！获得 2 积分 (演示模式)'
    }
  });
});

app.get('/api/user/signin-status', (req, res) => {
  res.json({
    success: true,
    data: {
      hasSignedToday: false,
      consecutiveDays: 6,
      monthlyDays: 15,
      lastSigninDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      nextWeeklyReward: 1,
      nextMonthlyReward: 10,
      rewards: {
        daily: 2,
        weekly: 5,
        monthly: 12
      }
    }
  });
});

app.get('/api/user/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        ...mockUsers.demo_user,
        effectiveLevel: 'plus',
        isSubscriptionActive: true
      },
      stats: {
        todayGenerations: 3,
        totalGenerations: 25,
        monthlyPointsUsed: 180,
        consecutiveSigninDays: 6
      },
      limits: {
        allowedModels: ['wan-i2v', 'wan-t2v'],
        maxDuration: 5,
        batchSize: 1,
        monthlyPoints: 120
      }
    }
  });
});

// 支付相关API (模拟)
app.get('/api/payment/plans', (req, res) => {
  res.json({
    success: true,
    data: {
      plans: [
        {
          id: 'free',
          name: '免费版',
          price: { monthly: { amount: 0, currency: 'USD' } },
          features: ['每月生成 3 次', '支持 5 秒视频', '480P 标准画质'],
          limits: {
            monthlyGenerations: 3,
            maxDuration: 5,
            allowedModels: ['wan-i2v'],
            maxResolution: '480p',
            batchSize: 1,
            monthlyPoints: 30
          }
        },
        {
          id: 'plus',
          name: 'Plus版',
          price: {
            monthly: { amount: 12.99, currency: 'USD' },
            yearly: { amount: 9.99, currency: 'USD' }
          },
          features: ['无限次生成', '支持 5 秒视频', '720P 高清画质', '文本转视频'],
          limits: {
            monthlyGenerations: -1,
            maxDuration: 5,
            allowedModels: ['wan-i2v', 'wan-t2v'],
            maxResolution: '720p',
            batchSize: 1,
            monthlyPoints: 120
          }
        }
      ]
    }
  });
});

app.get('/api/payment/points-packages', (req, res) => {
  res.json({
    success: true,
    data: {
      packages: [
        {
          id: 'points_100',
          points: 100,
          price: { amount: 9.99, currency: 'USD' },
          bonus: 10,
          popular: false,
          description: '基础积分包'
        },
        {
          id: 'points_250',
          points: 250,
          price: { amount: 22.99, currency: 'USD' },
          bonus: 25,
          popular: true,
          description: '进阶积分包'
        }
      ]
    }
  });
});

app.post('/api/payment/create-subscription', (req, res) => {
  res.json({
    success: true,
    data: {
      checkout_url: 'https://checkout.creem.com/session_demo_123',
      session_id: 'cs_demo_123',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      plan_details: {
        level: 'plus',
        duration: 'monthly',
        points: 120,
        price: 12.99
      }
    }
  });
});

app.get('/api/payment/subscription-status', (req, res) => {
  res.json({
    success: true,
    data: {
      current_plan: 'plus',
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_id: 'sub_demo_123',
      subscription_details: {
        status: 'active',
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        cancel_at_period_end: false
      }
    }
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
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || '服务器内部错误'
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 演示服务器运行在端口 ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'} (演示模式)`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🎯 API文档: http://localhost:${PORT}/`);
  console.log(`⚠️  注意: 这是演示模式，使用模拟数据，无需数据库`);
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

module.exports = app; 