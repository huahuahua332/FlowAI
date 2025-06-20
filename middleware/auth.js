const jwt = require('jsonwebtoken');
const User = require('../models/User');
const i18nService = require('../services/i18nService');

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: i18nService.getMessage('unauthorized', req.language || 'zh-CN')
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: i18nService.getMessage('user.not_found', req.language || 'zh-CN')
      });
    }

    // 检查用户状态
    if (user.riskProfile.status === 'banned') {
      return res.status(403).json({
        success: false,
        error: i18nService.getMessage('user.account_banned', user.preferences?.language || 'zh-CN')
      });
    }

    if (user.riskProfile.status === 'restricted') {
      // 检查限制是否过期
      if (user.riskProfile.restrictionExpiry && user.riskProfile.restrictionExpiry < new Date()) {
        user.riskProfile.status = 'normal';
        user.riskProfile.restrictionReason = null;
        user.riskProfile.restrictionExpiry = null;
        await user.save();
      } else {
        return res.status(403).json({
          success: false,
          error: i18nService.getMessage('user.account_restricted', user.preferences?.language || 'zh-CN'),
          restrictionReason: user.riskProfile.restrictionReason
        });
      }
    }

    // 记录登录信息（仅在特定路由中记录，避免频繁记录）
    if (req.method === 'POST' || req.url.includes('/login') || req.url.includes('/profile')) {
      await recordLoginInfo(req, user);
    }

    req.user = user;
    req.language = user.preferences?.language || req.language || 'zh-CN';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        error: i18nService.getMessage('server_error', req.language || 'zh-CN')
      });
    }
  }
};

// 记录登录信息
async function recordLoginInfo(req, user) {
  try {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const deviceFingerprint = generateDeviceFingerprint(req);
    
    // 获取地理位置信息（可选）
    const location = await getLocationInfo(ip);
    
    // 检查是否需要记录（避免短时间内重复记录）
    const recentLogin = user.loginHistory.find(login => 
      login.ip === ip && 
      login.userAgent === userAgent &&
      login.loginAt > new Date(Date.now() - 5 * 60 * 1000) // 5分钟内
    );
    
    if (!recentLogin) {
      await user.recordLogin({
        ip,
        userAgent,
        location,
        deviceFingerprint,
        success: true
      });
    }
  } catch (error) {
    console.error('记录登录信息失败:', error);
    // 不影响主流程
  }
}

// 获取客户端IP
function getClientIP(req) {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
}

// 生成设备指纹
function generateDeviceFingerprint(req) {
  const crypto = require('crypto');
  
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.headers['accept'] || ''
  ];
  
  const fingerprint = crypto
    .createHash('md5')
    .update(components.join('|'))
    .digest('hex');
    
  return fingerprint;
}

// 获取地理位置信息（示例实现）
async function getLocationInfo(ip) {
  try {
    // 这里可以集成第三方IP地理位置服务
    // 例如 MaxMind GeoIP、IP2Location 等
    
    // 简化实现，实际应该调用真实的地理位置API
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
      return {
        country: 'Local',
        city: 'Local',
        region: 'Local'
      };
    }
    
    // 示例：使用免费的IP API
    const axios = require('axios');
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 3000
    });
    
    if (response.data.status === 'success') {
      return {
        country: response.data.country,
        city: response.data.city,
        region: response.data.regionName
      };
    }
    
    return {};
  } catch (error) {
    console.error('获取地理位置信息失败:', error);
    return {};
  }
}

// 可选的认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.riskProfile.status !== 'banned') {
        req.user = user;
        req.language = user.preferences?.language || req.language || 'zh-CN';
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不影响流程
    next();
  }
};

// 管理员认证中间件
const requireAdmin = async (req, res, next) => {
  try {
    // 首先检查是否已通过基本认证
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // 检查管理员权限
    // 这里可以根据实际需求实现管理员权限检查
    // 例如检查用户角色、特定字段等
    
    // 简化实现：检查特定的管理员邮箱或ID
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
    
    if (!adminEmails.includes(req.user.email) && !adminIds.includes(req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// 频率限制中间件
const rateLimitMiddleware = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 100, // 最大请求数
    message: 'Too many requests',
    skipSuccessfulRequests: false
  };
  
  const config = { ...defaultOptions, ...options };
  const requests = new Map();
  
  return (req, res, next) => {
    const key = getClientIP(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // 清理过期记录
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    
    // 检查是否超过限制
    if (userRequests.length >= config.maxRequests) {
      return res.status(429).json({
        success: false,
        error: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    }
    
    // 记录请求
    userRequests.push(now);
    requests.set(key, userRequests);
    
    next();
  };
};

// 设备指纹验证中间件
const deviceFingerprintMiddleware = (req, res, next) => {
  if (req.user) {
    const currentFingerprint = generateDeviceFingerprint(req);
    req.deviceFingerprint = currentFingerprint;
    
    // 检查设备是否异常
    const recentLogins = req.user.loginHistory.filter(login => 
      login.loginAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const knownDevices = new Set(recentLogins.map(login => login.deviceFingerprint));
    
    if (knownDevices.size > 0 && !knownDevices.has(currentFingerprint)) {
      // 新设备登录，可以记录或发送警告
      console.log(`用户 ${req.user.email} 使用新设备登录: ${currentFingerprint}`);
    }
  }
  
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  rateLimitMiddleware,
  deviceFingerprintMiddleware,
  getClientIP,
  generateDeviceFingerprint
}; 