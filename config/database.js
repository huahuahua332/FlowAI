const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

let isConnected = false;
let isDemoMode = false;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.log('⚠️  未配置MONGODB_URI，启用演示模式');
      isDemoMode = true;
      return;
    }

    console.log('🔍 尝试连接到MongoDB...');
    console.log('📍 URI:', uri.replace(/\/\/.*@/, '//***:***@'));

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('✅ MongoDB连接成功');
    console.log('📊 数据库:', mongoose.connection.db.databaseName);

    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB连接错误:', error.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB连接断开');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB重新连接成功');
      isConnected = true;
    });
    
    // 初始化默认配置
    await initializeDefaultConfigs();
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    console.log('🔄 自动启用演示模式...');
    isDemoMode = true;
    isConnected = false;
  }
};

// 初始化默认配置
const initializeDefaultConfigs = async () => {
  const Config = require('../models/Config');
  
  const defaultConfigs = [

    {
      key: 'points_wan_i2v_5s',
      value: 22,
      description: 'WAN I2V 5秒480p视频生成所需积分 (成本每秒$0.09)',
      category: 'points'
    },
    {
      key: 'points_wan_i2v_10s',
      value: 32,
      description: 'WAN I2V 10秒480p视频生成所需积分 (成本每秒$0.09)',
      category: 'points'
    },
    {
      key: 'points_wan_t2v_5s',
      value: 45,
      description: 'WAN T2V 5秒720p视频生成所需积分 (成本每秒$0.24)',
      category: 'points'
    },
    {
      key: 'points_wan_t2v_10s',
      value: 65,
      description: 'WAN T2V 10秒720p视频生成所需积分 (成本每秒$0.24)',
      category: 'points'
    },
    {
      key: 'points_veo3_5s',
      value: 70,
      description: 'Veo-3 5秒1080p视频生成所需积分 (成本每秒$0.75)',
      category: 'points'
    },
    {
      key: 'points_veo3_10s',
      value: 140,
      description: 'Veo-3 10秒1080p视频生成所需积分 (成本每秒$0.75)',
      category: 'points'
    },
    {
      key: 'daily_signin_points',
      value: 2,
      description: '每日签到奖励积分',
      category: 'points'
    },
    {
      key: 'weekly_signin_bonus',
      value: 5,
      description: '连续签到7天额外奖励积分',
      category: 'points'
    },
    {
      key: 'monthly_signin_bonus',
      value: 12,
      description: '连续签到25天额外奖励积分',
      category: 'points'
    },
    {
      key: 'subscription_limits',
      value: {
        free: { 
          monthlyGenerations: 3, 
          maxDuration: 5, 
          allowedModels: ['wan-i2v'], 
          maxResolution: '480p',
          batchSize: 1,
          monthlyPoints: 30,
          priority: 'standard'
        },
        plus: { 
          monthlyGenerations: -1, 
          maxDuration: 5, 
          allowedModels: ['wan-i2v', 'wan-t2v'], 
          maxResolution: '720p',
          batchSize: 1,
          monthlyPoints: 120,
          priority: 'high'
        },
        pro: { 
          monthlyGenerations: -1, 
          maxDuration: 10, 
          allowedModels: ['wan-i2v', 'wan-t2v'], 
          maxResolution: '720p',
          batchSize: 4,
          monthlyPoints: 380,
          priority: 'high'
        },
        flagship: { 
          monthlyGenerations: -1, 
          maxDuration: 10, 
          allowedModels: ['wan-i2v', 'wan-t2v', 'veo-3'], 
          maxResolution: '1080p',
          batchSize: 4,
          monthlyPoints: 1000,
          priority: 'premium'
        }
      },
      description: '订阅等级限制配置',
      category: 'subscription'
    }
  ];

  for (const config of defaultConfigs) {
    await Config.setValue(config.key, config.value, config.description);
  }
  
  console.log('默认配置初始化完成');
};

// 获取连接状态
const getConnectionStatus = () => ({
  isConnected,
  isDemoMode,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host,
  port: mongoose.connection.port,
  name: mongoose.connection.name
});

// 健康检查
const healthCheck = async () => {
  if (isDemoMode) {
    return {
      status: 'demo',
      message: '演示模式运行中',
      database: 'mock'
    };
  }

  if (!isConnected) {
    return {
      status: 'disconnected',
      message: '数据库未连接',
      database: 'none'
    };
  }

  try {
    await mongoose.connection.db.admin().ping();
    return {
      status: 'connected',
      message: '数据库连接正常',
      database: mongoose.connection.db.databaseName
    };
  } catch (error) {
    return {
      status: 'error',
      message: '数据库响应异常',
      error: error.message,
      database: mongoose.connection.db.databaseName
    };
  }
};

module.exports = {
  connectDB,
  getConnectionStatus,
  healthCheck,
  get isConnected() { return isConnected; },
  get isDemoMode() { return isDemoMode; }
}; 