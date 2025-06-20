const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

const router = express.Router();

// Google OAuth 登录 - 完全按照文档要求重写
router.get('/google', (req, res) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALLBACK_URL;
  
  // 构建完整的Google OAuth 2.0认证URL，包含所有必需参数
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  console.log('OAuth认证URL:', authUrl);
  
  // 重定向到Google OAuth认证页面
  res.redirect(authUrl);
});

// Google OAuth 回调 - 按照文档要求完全重写
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'https://lbszbktvnuvn.sealoshzh.site';

  // 处理OAuth错误
  if (error) {
    console.error('OAuth错误:', error);
    return res.redirect(`${frontendUrl}/login?error=${error}`);
  }

  // 检查授权码
  if (!code) {
    console.error('缺少授权码');
    return res.redirect(`${frontendUrl}/login?error=missing_code`);
  }

  try {
    // 添加详细的调试日志
    console.log('=== OAuth回调开始 ===');
    console.log('请求参数:', { code: code.substring(0, 20) + '...', state, error });
    console.log('环境变量检查:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!process.env.GOOGLE_CALLBACK_URL,
      hasJwtSecret: !!process.env.JWT_SECRET
    });

    // 向Google换取访问令牌 - 添加必需的scope参数
    console.log('步骤1: 准备token请求');
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      scope: 'openid email profile'  // ✅ 添加必需的scope参数
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('步骤2: Token请求成功', { 
      hasAccessToken: !!tokenResponse.data.access_token,
      hasRefreshToken: !!tokenResponse.data.refresh_token 
    });

    const { access_token, refresh_token, id_token } = tokenResponse.data;

    if (!access_token) {
      throw new Error('未获取到访问令牌');
    }

    // 获取用户信息
    console.log('步骤3: 获取用户信息');
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    console.log('步骤4: 用户信息获取成功', {
      hasId: !!userResponse.data.id,
      hasEmail: !!userResponse.data.email,
      hasName: !!userResponse.data.name
    });

    const { id, email, name, picture } = userResponse.data;

    // 查找或创建用户
    console.log('步骤5: 处理用户数据');
    let user = await User.findOne({ googleId: id });
    
    if (!user) {
    // 检查是否已有相同邮箱的用户
      user = await User.findOne({ email: email });
    
    if (user) {
      // 关联 Google 账号
        console.log('关联现有用户到Google账号');
        user.googleId = id;
        user.avatar = picture || user.avatar;
        await user.save();
      } else {
        // 创建新用户
        console.log('创建新用户');
        user = new User({
          googleId: id,
          email: email,
          name: name,
          avatar: picture || '',
          points: 30 // 新用户赠送30积分
        });
        await user.save();
      }
    } else {
      // 更新用户信息
      console.log('更新现有用户信息');
      user.name = name;
      user.avatar = picture || user.avatar;
      await user.save();
    }

    console.log('步骤6: 用户处理完成', {
      userId: user._id,
      email: user.email,
      name: user.name
});

    // 生成JWT token
    console.log('步骤7: 生成JWT token');
    const jwtToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        name: user.name 
      },
        process.env.JWT_SECRET,
      { expiresIn: '24h' }
      );

    console.log('JWT token生成成功');

    // 设置安全cookie
    res.cookie('auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    });

      // 准备用户信息
      const userInfo = {
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      subscriptionLevel: user.subscriptionLevel,
      points: user.points,
      isSubscriptionActive: user.isSubscriptionActive(),
      effectiveLevel: user.getEffectiveSubscriptionLevel()
      };

    // 成功后重定向到前端
      const encodedUser = encodeURIComponent(JSON.stringify(userInfo));
    const redirectUrl = `${frontendUrl}/home?auth=success&token=${jwtToken}&user=${encodedUser}`;
    
    console.log('步骤8: 重定向到前端');
    console.log('重定向URL:', redirectUrl.substring(0, 100) + '...');
    console.log('=== OAuth回调成功完成 ===');
    
    res.redirect(redirectUrl);

    } catch (error) {
    console.error('=== OAuth处理失败 ===');
    console.error('错误详情:', error);
    console.error('错误响应:', error.response?.data);
    res.redirect(`${frontendUrl}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
    }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供访问令牌'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          subscriptionLevel: user.subscriptionLevel,
          points: user.points,
          isSubscriptionActive: user.isSubscriptionActive(),
          effectiveLevel: user.getEffectiveSubscriptionLevel()
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(403).json({
      success: false,
      message: '无效的访问令牌'
    });
  }
});

// 登出
router.post('/logout', (req, res) => {
  // 清除cookie
  res.clearCookie('auth_token');
    res.json({
      success: true,
      message: '登出成功'
  });
});
module.exports = router; 