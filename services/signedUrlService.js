const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class SignedUrlService {
  constructor() {
    this.secret = process.env.SIGNED_URL_SECRET || 'default-secret-key';
    this.defaultExpiry = 24 * 60 * 60 * 1000; // 24小时
  }

  // 生成签名URL
  generateSignedUrl(videoId, userId, options = {}) {
    const expiryTime = options.expiryTime || (Date.now() + this.defaultExpiry);
    const permissions = options.permissions || ['download'];
    
    const payload = {
      videoId,
      userId,
      permissions,
      exp: Math.floor(expiryTime / 1000), // JWT使用秒
      iat: Math.floor(Date.now() / 1000),
      type: 'video_access'
    };

    const token = jwt.sign(payload, this.secret, { algorithm: 'HS256' });
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/api/video/${videoId}/download?token=${token}`;
  }

  // 验证签名URL
  verifySignedUrl(token, videoId, userId) {
    try {
      const payload = jwt.verify(token, this.secret);
      
      // 检查基本信息
      if (payload.videoId !== videoId) {
        return { valid: false, error: 'Video ID mismatch' };
      }
      
      if (payload.userId !== userId) {
        return { valid: false, error: 'User ID mismatch' };
      }
      
      if (payload.type !== 'video_access') {
        return { valid: false, error: 'Invalid token type' };
      }
      
      // 检查权限
      if (!payload.permissions || !payload.permissions.includes('download')) {
        return { valid: false, error: 'Insufficient permissions' };
      }
      
      return { 
        valid: true, 
        payload,
        permissions: payload.permissions 
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired' };
      } else if (error.name === 'JsonWebTokenError') {
        return { valid: false, error: 'Invalid token' };
      } else {
        return { valid: false, error: 'Token verification failed' };
      }
    }
  }

  // 生成批量下载签名URL
  generateBatchSignedUrl(videoIds, userId, options = {}) {
    const expiryTime = options.expiryTime || (Date.now() + this.defaultExpiry);
    const permissions = options.permissions || ['download'];
    
    const payload = {
      videoIds,
      userId,
      permissions,
      exp: Math.floor(expiryTime / 1000),
      iat: Math.floor(Date.now() / 1000),
      type: 'batch_video_access'
    };

    const token = jwt.sign(payload, this.secret, { algorithm: 'HS256' });
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/api/video/batch/download?token=${token}`;
  }

  // 验证批量下载签名URL
  verifyBatchSignedUrl(token, userId) {
    try {
      const payload = jwt.verify(token, this.secret);
      
      if (payload.userId !== userId) {
        return { valid: false, error: 'User ID mismatch' };
      }
      
      if (payload.type !== 'batch_video_access') {
        return { valid: false, error: 'Invalid token type' };
      }
      
      if (!payload.permissions || !payload.permissions.includes('download')) {
        return { valid: false, error: 'Insufficient permissions' };
      }
      
      return { 
        valid: true, 
        payload,
        videoIds: payload.videoIds,
        permissions: payload.permissions 
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired' };
      } else {
        return { valid: false, error: 'Invalid token' };
      }
    }
  }

  // 生成OSS签名URL（用于直接访问OSS资源）
  generateOssSignedUrl(ossKey, options = {}) {
    const expiryTime = options.expiryTime || (Date.now() + this.defaultExpiry);
    const method = options.method || 'GET';
    
    // 这里需要根据实际使用的OSS服务来实现
    // 以阿里云OSS为例
    if (process.env.OSS_PROVIDER === 'aliyun') {
      return this.generateAliyunOssSignedUrl(ossKey, method, expiryTime);
    } else if (process.env.OSS_PROVIDER === 'aws') {
      return this.generateAwsS3SignedUrl(ossKey, method, expiryTime);
    } else {
      // 默认使用自定义签名
      return this.generateCustomSignedUrl(ossKey, method, expiryTime);
    }
  }

  // 阿里云OSS签名URL
  generateAliyunOssSignedUrl(ossKey, method, expiryTime) {
    const OSS = require('ali-oss');
    
    const client = new OSS({
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET
    });

    const expires = Math.floor(expiryTime / 1000);
    return client.signatureUrl(ossKey, { method, expires });
  }

  // AWS S3签名URL
  generateAwsS3SignedUrl(ossKey, method, expiryTime) {
    const AWS = require('aws-sdk');
    
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: ossKey,
      Expires: Math.floor((expiryTime - Date.now()) / 1000)
    };

    return s3.getSignedUrl('getObject', params);
  }

  // 自定义签名URL
  generateCustomSignedUrl(ossKey, method, expiryTime) {
    const payload = {
      key: ossKey,
      method,
      exp: Math.floor(expiryTime / 1000),
      iat: Math.floor(Date.now() / 1000),
      type: 'oss_access'
    };

    const token = jwt.sign(payload, this.secret, { algorithm: 'HS256' });
    
    const baseUrl = process.env.OSS_BASE_URL || process.env.FRONTEND_URL;
    return `${baseUrl}/api/oss/access/${encodeURIComponent(ossKey)}?token=${token}`;
  }

  // 验证OSS签名URL
  verifyOssSignedUrl(token, ossKey) {
    try {
      const payload = jwt.verify(token, this.secret);
      
      if (payload.key !== ossKey) {
        return { valid: false, error: 'Key mismatch' };
      }
      
      if (payload.type !== 'oss_access') {
        return { valid: false, error: 'Invalid token type' };
      }
      
      return { valid: true, payload };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired' };
      } else {
        return { valid: false, error: 'Invalid token' };
      }
    }
  }

  // 生成防盗链签名
  generateAntiLeechSignature(url, userAgent, referer, ip) {
    const timestamp = Math.floor(Date.now() / 1000);
    const data = `${url}|${userAgent}|${referer}|${ip}|${timestamp}`;
    
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    
    return {
      signature,
      timestamp,
      expires: timestamp + 3600 // 1小时有效期
    };
  }

  // 验证防盗链签名
  verifyAntiLeechSignature(url, userAgent, referer, ip, signature, timestamp) {
    const now = Math.floor(Date.now() / 1000);
    
    // 检查时间戳是否过期
    if (now > timestamp + 3600) {
      return { valid: false, error: 'Signature expired' };
    }
    
    const data = `${url}|${userAgent}|${referer}|${ip}|${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    return { valid: true };
  }

  // 更新视频的签名URL
  async updateVideoSignedUrl(videoId, userId, forceRefresh = false) {
    const Video = require('../models/Video');
    
    try {
      const video = await Video.findOne({ _id: videoId, userId });
      if (!video) {
        return { success: false, error: 'Video not found' };
      }
      
      // 检查是否需要更新
      if (!forceRefresh && video.signedUrl && video.signedUrlExpiry && video.signedUrlExpiry > new Date()) {
        return { 
          success: true, 
          signedUrl: video.signedUrl,
          expiryTime: video.signedUrlExpiry 
        };
      }
      
      // 生成新的签名URL
      const expiryTime = Date.now() + this.defaultExpiry;
      const signedUrl = this.generateSignedUrl(videoId, userId, { expiryTime });
      
      // 更新数据库
      await Video.findByIdAndUpdate(videoId, {
        signedUrl,
        signedUrlExpiry: new Date(expiryTime)
      });
      
      return { 
        success: true, 
        signedUrl,
        expiryTime: new Date(expiryTime)
      };
    } catch (error) {
      console.error('更新签名URL失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 批量更新签名URL
  async batchUpdateSignedUrls(videoIds, userId) {
    const Video = require('../models/Video');
    
    try {
      const videos = await Video.find({ 
        _id: { $in: videoIds }, 
        userId 
      });
      
      const updates = [];
      const results = [];
      
      for (const video of videos) {
        const expiryTime = Date.now() + this.defaultExpiry;
        const signedUrl = this.generateSignedUrl(video._id, userId, { expiryTime });
        
        updates.push({
          updateOne: {
            filter: { _id: video._id },
            update: {
              signedUrl,
              signedUrlExpiry: new Date(expiryTime)
            }
          }
        });
        
        results.push({
          videoId: video._id,
          signedUrl,
          expiryTime: new Date(expiryTime)
        });
      }
      
      if (updates.length > 0) {
        await Video.bulkWrite(updates);
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('批量更新签名URL失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 清理过期的签名URL
  async cleanupExpiredSignedUrls() {
    const Video = require('../models/Video');
    
    try {
      const result = await Video.updateMany(
        { signedUrlExpiry: { $lt: new Date() } },
        { 
          $unset: { 
            signedUrl: 1, 
            signedUrlExpiry: 1 
          } 
        }
      );
      
      console.log(`清理了 ${result.modifiedCount} 个过期的签名URL`);
      return { success: true, count: result.modifiedCount };
    } catch (error) {
      console.error('清理过期签名URL失败:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SignedUrlService(); 