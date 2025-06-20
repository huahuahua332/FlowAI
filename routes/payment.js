const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const creemService = require('../services/creemService');

const router = express.Router();

// Creem 支付 Webhook
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-creem-signature'] || req.headers['creem-signature'];
    const payload = JSON.stringify(req.body);
    
    // 验证 webhook 签名
    if (!creemService.verifyWebhookSignature(payload, signature)) {
      console.error('Webhook 签名验证失败');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, data } = req.body;
    console.log('收到 Webhook 事件:', type, data);

    switch (type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(data);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(data);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(data);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(data);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(data);
        break;
      default:
        console.log('未处理的事件类型:', type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook 处理错误:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// 处理支付会话完成
async function handleCheckoutCompleted(sessionData) {
  try {
    const { customer_email, mode, line_items, metadata } = sessionData;
    
    const user = await User.findOne({ email: customer_email });
    if (!user) {
      console.error('用户不存在:', customer_email);
      return;
    }

    if (mode === 'payment') {
      // 一次性支付 (积分充值)
      const priceId = line_items[0]?.price?.id;
      const planDetails = creemService.getPlanDetails(priceId);
      
      if (planDetails && planDetails.type === 'points') {
        await User.findByIdAndUpdate(user._id, {
          $inc: { points: planDetails.points }
        });
        
        console.log(`用户 ${user.email} 充值 ${planDetails.points} 积分`);
      }
    }
    // 订阅支付在 subscription.created 事件中处理
  } catch (error) {
    console.error('处理支付完成错误:', error);
  }
}

// 处理支付成功 (用于订阅续费)
async function handlePaymentSucceeded(invoiceData) {
  try {
    const { customer_email, subscription, lines } = invoiceData;
    
    const user = await User.findOne({ email: customer_email });
    if (!user) {
      console.error('用户不存在:', customer_email);
      return;
    }

    // 获取订阅计划详情
    const priceId = lines.data[0]?.price?.id;
    const planDetails = creemService.getPlanDetails(priceId);
    
    if (planDetails && planDetails.level) {
      // 续费成功，发放积分奖励
      await User.findByIdAndUpdate(user._id, {
        $inc: { points: planDetails.points }
      });
      
      console.log(`用户 ${user.email} 订阅续费，获得 ${planDetails.points} 积分`);
    }
  } catch (error) {
    console.error('处理支付成功错误:', error);
  }
}

// 处理订阅创建
async function handleSubscriptionCreated(subscriptionData) {
  try {
    const { customer, items, current_period_end, id: subscriptionId } = subscriptionData;
    
    const user = await User.findOne({ email: customer.email });
    if (!user) {
      console.error('用户不存在:', customer.email);
      return;
    }

    // 获取订阅计划详情
    const priceId = items.data[0]?.price?.id;
    const planDetails = creemService.getPlanDetails(priceId);
    
    if (planDetails && planDetails.level) {
      const expiryDate = new Date(current_period_end * 1000);
      
      await User.findByIdAndUpdate(user._id, {
        subscriptionLevel: planDetails.level,
        subscriptionExpiry: expiryDate,
        subscriptionId: subscriptionId,
        $inc: { points: planDetails.points }
      });

      console.log(`用户 ${user.email} 订阅 ${planDetails.level} 至 ${expiryDate}，获得 ${planDetails.points} 积分`);
    }
  } catch (error) {
    console.error('处理订阅创建错误:', error);
  }
}

// 处理订阅更新
async function handleSubscriptionUpdated(subscriptionData) {
  try {
    const { customer, items, current_period_end, id: subscriptionId, status } = subscriptionData;
    
    const user = await User.findOne({ email: customer.email });
    if (!user) {
      console.error('用户不存在:', customer.email);
      return;
    }

    // 获取订阅计划详情
    const priceId = items.data[0]?.price?.id;
    const planDetails = creemService.getPlanDetails(priceId);
    
    if (planDetails && planDetails.level) {
      const expiryDate = new Date(current_period_end * 1000);
      
      await User.findByIdAndUpdate(user._id, {
        subscriptionLevel: planDetails.level,
        subscriptionExpiry: expiryDate,
        subscriptionId: subscriptionId
      });

      console.log(`用户 ${user.email} 订阅更新为 ${planDetails.level} 至 ${expiryDate}，状态: ${status}`);
    }
  } catch (error) {
    console.error('处理订阅更新错误:', error);
  }
}

// 处理订阅取消
async function handleSubscriptionCancelled(subscriptionData) {
  try {
    const { customer, current_period_end } = subscriptionData;
    
    const user = await User.findOne({ email: customer.email });
    if (!user) {
      console.error('用户不存在:', customer.email);
      return;
    }

    // 设置订阅在当前周期结束时到期
    const expiryDate = new Date(current_period_end * 1000);
    
    await User.findByIdAndUpdate(user._id, {
      subscriptionExpiry: expiryDate,
      subscriptionId: null
    });

    console.log(`用户 ${user.email} 取消订阅，将在 ${expiryDate} 到期`);
  } catch (error) {
    console.error('处理订阅取消错误:', error);
  }
}



// 统一的支付结账端点 (兼容前端调用)
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { product_id, type = 'subscription' } = req.body;
    const user = req.user;

    console.log('🔥 收到支付请求:', { 
      product_id, 
      type, 
      user_email: user?.email,
      user_id: user?._id,
      headers: req.headers,
      body: req.body
    });

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // 验证产品ID是否有效
    const planDetails = creemService.getPlanDetails(product_id);
    if (!planDetails) {
      console.error('无效的产品ID:', product_id);
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    let result;
    
    if (planDetails.type === 'points') {
      // 积分充值
      result = await creemService.createOneTimePayment(
        product_id,
        user.email,
        user.name || user.email,
        {
          user_id: user._id.toString(),
          points_amount: planDetails.points
        }
      );
    } else {
      // 订阅支付
      result = await creemService.createSubscriptionPayment(
        product_id,
        user.email,
        user.name || user.email,
        {
          user_id: user._id.toString(),
          plan_level: planDetails.level,
          plan_duration: planDetails.duration
        }
      );
    }

    if (result.success) {
      console.log('✅ 支付链接创建成功:', result.data.checkout_url);
      const response = {
        success: true,
        checkout_url: result.data.checkout_url,
        session_id: result.data.session_id,
        expires_at: result.data.expires_at,
        plan_details: planDetails
      };
      console.log('📤 返回给前端的响应:', response);
      res.json(response);
    } else {
      console.error('❌ Creem API 错误:', result.error);
      const errorResponse = {
        success: false,
        message: result.error || '创建支付链接失败，请稍后重试'
      };
      console.log('📤 返回错误响应:', errorResponse);
      res.status(400).json(errorResponse);
    }
  } catch (error) {
    console.error('❌ 创建支付链接异常:', error);
    console.error('错误堆栈:', error.stack);
    const errorResponse = {
      success: false,
      message: '创建支付链接失败，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    console.log('📤 返回异常响应:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// 创建订阅支付链接
router.post('/create-subscription', authenticateToken, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const user = req.user;

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        message: '订阅计划ID不能为空'
      });
    }

    // 验证计划ID是否有效
    const planDetails = creemService.getPlanDetails(plan_id);
    if (!planDetails || !planDetails.level) {
      return res.status(400).json({
        success: false,
        message: '无效的订阅计划ID'
      });
    }

    const result = await creemService.createSubscriptionPayment(
      plan_id,
      user.email,
      user.name || user.email,
      {
        user_id: user._id.toString(),
        plan_level: planDetails.level,
        plan_duration: planDetails.duration
      }
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          checkout_url: result.data.checkout_url,
          session_id: result.data.session_id,
          expires_at: result.data.expires_at,
          plan_details: planDetails
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('创建订阅支付链接错误:', error);
    res.status(500).json({
      success: false,
      message: '创建支付链接失败'
    });
  }
});

// 创建积分充值支付链接
router.post('/create-points-payment', authenticateToken, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const user = req.user;

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        message: '积分充值计划ID不能为空'
      });
    }

    // 验证计划ID是否有效
    const planDetails = creemService.getPlanDetails(plan_id);
    if (!planDetails || planDetails.type !== 'points') {
      return res.status(400).json({
        success: false,
        message: '无效的积分充值计划ID'
      });
    }

    const result = await creemService.createOneTimePayment(
      plan_id,
      user.email,
      user.name || user.email,
      {
        user_id: user._id.toString(),
        points_amount: planDetails.points
      }
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          checkout_url: result.data.checkout_url,
          session_id: result.data.session_id,
          expires_at: result.data.expires_at,
          plan_details: planDetails
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('创建积分充值支付链接错误:', error);
    res.status(500).json({
      success: false,
      message: '创建支付链接失败'
    });
  }
});

// 获取订阅计划
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        id: 'free',
        name: '免费版',
        price: {
          monthly: { amount: 0, currency: 'USD' }
        },
        features: [
          '每月生成 3 次',
          '支持 5 秒视频',
          '480P 标准画质',
          '基础模型 (WAN I2V)',
          '赠送 30 积分'
        ],
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
        features: [
          '无限生成',
          '支持 5 秒视频',
          '720P 高清画质',
          '双模型 (WAN I2V + T2V)',
          '优先处理队列',
          '赠送 120 积分'
        ],
        limits: {
          monthlyGenerations: -1,
          maxDuration: 5,
          allowedModels: ['wan-i2v', 'wan-t2v'],
          maxResolution: '720p',
          batchSize: 1,
          monthlyPoints: 120
        }
      },
      {
        id: 'pro',
        name: 'Pro版',
        price: {
          monthly: { amount: 36.99, currency: 'USD' },
          yearly: { amount: 29.99, currency: 'USD' }
        },
        features: [
          '无限生成',
          '支持 5-10 秒视频',
          '720P 高清画质',
          '批量生成 4 个视频',
          '双模型 (WAN I2V + T2V)',
          '优先处理队列',
          '赠送 380 积分'
        ],
        limits: {
          monthlyGenerations: -1,
          maxDuration: 10,
          allowedModels: ['wan-i2v', 'wan-t2v'],
          maxResolution: '720p',
          batchSize: 4,
          monthlyPoints: 380
        }
      },
      {
        id: 'flagship',
        name: '旗舰版',
        price: {
          monthly: { amount: 99.99, currency: 'USD' },
          yearly: { amount: 69.99, currency: 'USD' }
        },
        features: [
          '无限生成',
          '支持 5-10 秒视频',
          '1080P 超高清画质',
          '批量生成 4 个视频',
          '全模型 (WAN I2V + T2V + Veo-3)',
          '优先处理队列',
          '新功能优先体验',
          '赠送 1000 积分'
        ],
        limits: {
          monthlyGenerations: -1,
          maxDuration: 10,
          allowedModels: ['wan-i2v', 'wan-t2v', 'veo-3'],
          maxResolution: '1080p',
          batchSize: 4,
          monthlyPoints: 1000
        }
      }
    ];

    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    console.error('获取订阅计划错误:', error);
    res.status(500).json({
      success: false,
      message: '获取订阅计划失败'
    });
  }
});

// 获取积分充值选项
router.get('/points-packages', async (req, res) => {
  try {
    const packages = [
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
        popular: false,
        description: '进阶积分包'
      },
      {
        id: 'points_500',
        points: 500,
        price: { amount: 44.99, currency: 'USD' },
        bonus: 50,
        popular: true,
        description: '高级积分包'
      },
      {
        id: 'points_1000',
        points: 1000,
        price: { amount: 79.99, currency: 'USD' },
        bonus: 0,
        popular: false,
        description: '超值积分包'
      }
    ];

    res.json({
      success: true,
      data: { packages }
    });
  } catch (error) {
    console.error('获取积分充值选项错误:', error);
    res.status(500).json({
      success: false,
      message: '获取积分充值选项失败'
    });
  }
});

// 获取支付会话状态
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await creemService.getCheckoutSession(sessionId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('获取支付会话状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取支付状态失败'
    });
  }
});

// 取消订阅
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.subscriptionId) {
      return res.status(400).json({
        success: false,
        message: '没有活跃的订阅'
      });
    }

    const result = await creemService.cancelSubscription(user.subscriptionId);
    
    if (result.success) {
      res.json({
        success: true,
        message: '订阅已取消，将在当前周期结束时生效'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('取消订阅错误:', error);
    res.status(500).json({
      success: false,
      message: '取消订阅失败'
    });
  }
});

// 获取用户订阅状态
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    let subscriptionDetails = null;
    if (user.subscriptionId) {
      const result = await creemService.getSubscription(user.subscriptionId);
      if (result.success) {
        subscriptionDetails = result.data;
      }
    }

    res.json({
      success: true,
      data: {
        current_plan: user.subscriptionLevel,
        expiry_date: user.subscriptionExpiry,
        subscription_id: user.subscriptionId,
        subscription_details: subscriptionDetails,
        points: user.points,
        monthly_generations: user.monthlyGenerations
      }
    });
  } catch (error) {
    console.error('获取订阅状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取订阅状态失败'
    });
  }
});

// 获取支付历史
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10 } = req.query;
    
    // 这里可以从数据库获取支付历史记录
    // 目前返回模拟数据
    const history = {
      payments: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取支付历史错误:', error);
    res.status(500).json({
      success: false,
      message: '获取支付历史失败'
    });
  }
});

module.exports = router; 