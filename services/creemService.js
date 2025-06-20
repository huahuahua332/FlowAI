const axios = require('axios');
const crypto = require('crypto');

class CreemService {
  constructor() {
    this.apiUrl = process.env.CREEM_API_URL;
    this.apiKey = process.env.CREEM_API_KEY;
    this.webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
  }

  // 创建订阅支付链接
  async createSubscriptionPayment(planId, customerEmail, customerName, metadata = {}) {
    try {
      const requestData = {
        product_id: planId,
        success_url: `${process.env.FRONTEND_URL}/payment/success`,
        request_id: metadata.user_id || `user_${Date.now()}`
      };

      console.log('Creem API 请求数据:', requestData);

      const response = await axios.post(`${this.apiUrl}/v1/checkouts`, requestData, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log('Creem API 响应:', response.data);

      return {
        success: true,
        data: {
          checkout_url: response.data.checkout_url,
          session_id: response.data.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
        }
      };
    } catch (error) {
      console.error('Creem 创建订阅支付错误:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // 创建一次性支付链接 (积分充值)
  async createOneTimePayment(planId, customerEmail, customerName, metadata = {}) {
    try {
      const requestData = {
        product_id: planId,
        success_url: `${process.env.FRONTEND_URL}/payment/success`,
        request_id: metadata.user_id || `user_${Date.now()}`
      };

      console.log('Creem API 请求数据 (积分充值):', requestData);

      const response = await axios.post(`${this.apiUrl}/v1/checkouts`, requestData, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log('Creem API 响应 (积分充值):', response.data);

      return {
        success: true,
        data: {
          checkout_url: response.data.checkout_url,
          session_id: response.data.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };
    } catch (error) {
      console.error('Creem 创建一次性支付错误:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // 获取支付会话详情
  async getCheckoutSession(sessionId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v1/checkout-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('获取支付会话错误:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // 获取订阅详情
  async getSubscription(subscriptionId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v1/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('获取订阅详情错误:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // 取消订阅
  async cancelSubscription(subscriptionId) {
    try {
      const response = await axios.post(`${this.apiUrl}/v1/subscriptions/${subscriptionId}/cancel`, {}, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('取消订阅错误:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // 验证 Webhook 签名
  verifyWebhookSignature(payload, signature) {
    try {
      if (!signature) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');
      
      const receivedSignature = signature.replace('sha256=', '');
      
      // 确保两个签名长度相同
      if (expectedSignature.length !== receivedSignature.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('验证 Webhook 签名错误:', error);
      return false;
    }
  }

  // 根据计划ID获取订阅等级和积分
  getPlanDetails(planId) {
    const planMapping = {
      // Plus 计划
      [process.env.CREEM_PLAN_PLUS_MONTHLY]: {
        level: 'plus',
        duration: 'monthly',
        points: 120,
        price: 12.99
      },
      [process.env.CREEM_PLAN_PLUS_YEARLY]: {
        level: 'plus',
        duration: 'yearly',
        points: 1440, // 120 * 12
        price: 119.88 // 9.99 * 12
      },
      
      // Pro 计划
      [process.env.CREEM_PLAN_PRO_MONTHLY]: {
        level: 'pro',
        duration: 'monthly',
        points: 380,
        price: 36.99
      },
      [process.env.CREEM_PLAN_PRO_YEARLY]: {
        level: 'pro',
        duration: 'yearly',
        points: 4560, // 380 * 12
        price: 359.88 // 29.99 * 12
      },
      
      // 旗舰版计划
      [process.env.CREEM_PLAN_FLAGSHIP_MONTHLY]: {
        level: 'flagship',
        duration: 'monthly',
        points: 1000,
        price: 99.99
      },
      [process.env.CREEM_PLAN_FLAGSHIP_YEARLY]: {
        level: 'flagship',
        duration: 'yearly',
        points: 12000, // 1000 * 12
        price: 839.88 // 69.99 * 12
      },
      
      // 积分充值
      [process.env.CREEM_POINTS_100]: {
        type: 'points',
        points: 110, // 100 + 10 赠送
        price: 9.99
      },
      [process.env.CREEM_POINTS_250]: {
        type: 'points',
        points: 275, // 250 + 25 赠送
        price: 22.99
      },
      [process.env.CREEM_POINTS_500]: {
        type: 'points',
        points: 550, // 500 + 50 赠送
        price: 44.99
      },
      [process.env.CREEM_POINTS_1000]: {
        type: 'points',
        points: 1000, // 无赠送
        price: 79.99
      }
    };

    return planMapping[planId] || null;
  }
}

module.exports = new CreemService(); 