const mongoose = require('mongoose');
const Config = require('../models/Config');
require('dotenv').config({ path: './config.env' });

// 默认配置
const defaultConfigs = [

  {
    key: 'daily_signin_points',
    value: 2,
    description: '每日签到奖励积分',
    category: 'points',
    dataType: 'number'
  },
  {
    key: 'new_user_points',
    value: 30,
    description: '新用户注册赠送积分',
    category: 'points',
    dataType: 'number'
  },
  {
    key: 'max_video_duration',
    value: 30,
    description: '最大视频时长（秒）',
    category: 'system',
    dataType: 'number'
  },
  {
    key: 'max_concurrent_generations',
    value: 5,
    description: '最大并发生成数量',
    category: 'system',
    dataType: 'number'
  },
  {
    key: 'api_timeout',
    value: 300,
    description: 'API超时时间（秒）',
    category: 'system',
    dataType: 'number'
  },
  {
    key: 'enable_payment',
    value: true,
    description: '启用支付功能',
    category: 'payment',
    dataType: 'boolean'
  },
  {
    key: 'subscription_prices',
    value: {
      plus: 29,
      pro: 99,
      flagship: 299
    },
    description: '订阅价格配置',
    category: 'payment',
    dataType: 'json'
  }
];

async function initConfigs() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: process.env.DB_NAME
    });

    console.log('✅ 数据库连接成功');

    // 初始化配置
    for (const config of defaultConfigs) {
      const existingConfig = await Config.findOne({ key: config.key });
      
      if (!existingConfig) {
        await Config.create(config);
        console.log(`✅ 创建配置: ${config.key}`);
      } else {
        console.log(`⚠️  配置已存在: ${config.key}`);
      }
    }

    console.log('🎉 配置初始化完成');
    process.exit(0);

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initConfigs();
}

module.exports = initConfigs; 