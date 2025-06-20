const nodemailer = require('nodemailer');
const axios = require('axios');

class NotificationService {
  constructor() {
    this.emailTransporter = this.setupEmailTransporter();
    this.templates = this.loadTemplates();
  }

  // 设置邮件传输器
  setupEmailTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP配置不完整，邮件功能将不可用');
      return null;
    }

    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // 加载通知模板
  loadTemplates() {
    return {
      'zh-CN': {
        videoCompleted: {
          subject: '🎉 视频生成完成',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4CAF50;">视频生成完成！</h2>
              <p>您好，</p>
              <p>您的视频 "<strong>{{title}}</strong>" 已经生成完成。</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>视频信息：</strong></p>
                <ul>
                  <li>标题：{{title}}</li>
                  <li>模型：{{model}}</li>
                  <li>时长：{{duration}}秒</li>
                  <li>生成时间：{{createdAt}}</li>
                </ul>
              </div>
              <p>
                <a href="{{videoUrl}}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  查看视频
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                感谢您使用我们的服务！<br>
                如有问题，请联系客服。
              </p>
            </div>
          `
        },
        videoFailed: {
          subject: '❌ 视频生成失败',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f44336;">视频生成失败</h2>
              <p>您好，</p>
              <p>很抱歉，您的视频生成请求失败了。</p>
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p><strong>失败信息：</strong></p>
                <ul>
                  <li>提示词：{{prompt}}</li>
                  <li>模型：{{model}}</li>
                  <li>失败原因：{{errorMessage}}</li>
                  <li>失败时间：{{failedAt}}</li>
                </ul>
              </div>
              <p>我们已经自动为您退还了 <strong>{{refundAmount}}</strong> 积分。</p>
              <p>
                <a href="{{retryUrl}}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  重新生成
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                如果问题持续存在，请联系客服寻求帮助。
              </p>
            </div>
          `
        },
        subscriptionExpiring: {
          subject: '⏰ 订阅即将到期提醒',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ff9800;">订阅即将到期</h2>
              <p>您好，</p>
              <p>您的 <strong>{{subscriptionLevel}}</strong> 订阅将在 <strong>{{daysLeft}}</strong> 天后到期。</p>
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>订阅信息：</strong></p>
                <ul>
                  <li>订阅等级：{{subscriptionLevel}}</li>
                  <li>到期时间：{{expiryDate}}</li>
                  <li>剩余天数：{{daysLeft}}天</li>
                </ul>
              </div>
              <p>为了避免服务中断，请及时续费。</p>
              <p>
                <a href="{{renewUrl}}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  立即续费
                </a>
              </p>
            </div>
          `
        },
        accountRestricted: {
          subject: '⚠️ 账户受限通知',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f44336;">账户受限通知</h2>
              <p>您好，</p>
              <p>由于以下原因，您的账户已被限制使用：</p>
              <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
                <p><strong>限制原因：</strong>{{restrictionReason}}</p>
                <p><strong>限制时间：</strong>{{restrictionDate}}</p>
                {{#restrictionExpiry}}
                <p><strong>解除时间：</strong>{{restrictionExpiry}}</p>
                {{/restrictionExpiry}}
              </div>
              <p>如有疑问，请联系客服申诉。</p>
              <p>
                <a href="{{appealUrl}}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  申诉处理
                </a>
              </p>
            </div>
          `
        }
      },
      'en-US': {
        videoCompleted: {
          subject: '🎉 Video Generation Completed',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4CAF50;">Video Generation Completed!</h2>
              <p>Hello,</p>
              <p>Your video "<strong>{{title}}</strong>" has been successfully generated.</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Video Information:</strong></p>
                <ul>
                  <li>Title: {{title}}</li>
                  <li>Model: {{model}}</li>
                  <li>Duration: {{duration}} seconds</li>
                  <li>Created: {{createdAt}}</li>
                </ul>
              </div>
              <p>
                <a href="{{videoUrl}}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Video
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Thank you for using our service!<br>
                If you have any questions, please contact support.
              </p>
            </div>
          `
        }
        // ... 其他英文模板
      }
    };
  }

  // 发送邮件通知
  async sendEmail(to, templateName, data, language = 'zh-CN') {
    if (!this.emailTransporter) {
      console.warn('邮件传输器未配置，无法发送邮件');
      return false;
    }

    try {
      const template = this.templates[language]?.[templateName];
      if (!template) {
        console.error(`未找到模板: ${templateName} (${language})`);
        return false;
      }

      const subject = this.renderTemplate(template.subject, data);
      const html = this.renderTemplate(template.html, data);

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html
      });

      console.log(`邮件发送成功: ${to} - ${subject}`);
      return true;
    } catch (error) {
      console.error('邮件发送失败:', error);
      return false;
    }
  }

  // 发送Webhook通知
  async sendWebhook(url, data, options = {}) {
    if (!url) {
      console.warn('Webhook URL未提供');
      return false;
    }

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        event: options.event || 'notification',
        data,
        signature: this.generateSignature(data)
      };

      const response = await axios.post(url, payload, {
        timeout: options.timeout || 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VideoGeneration-Webhook/1.0',
          ...options.headers
        }
      });

      console.log(`Webhook发送成功: ${url} - ${response.status}`);
      return true;
    } catch (error) {
      console.error('Webhook发送失败:', error);
      return false;
    }
  }

  // 生成签名
  generateSignature(data) {
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  // 渲染模板
  renderTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  // 通知视频生成完成
  async notifyVideoCompleted(user, video) {
    const data = {
      title: video.title,
      model: video.model,
      duration: video.duration,
      createdAt: video.createdAt.toLocaleString(),
      videoUrl: `${process.env.FRONTEND_URL}/video/${video._id}`
    };

    const tasks = [];

    // 发送邮件通知
    if (user.preferences?.emailNotifications) {
      tasks.push(
        this.sendEmail(
          user.email,
          'videoCompleted',
          data,
          user.preferences?.language || 'zh-CN'
        )
      );
    }

    // 发送Webhook通知
    if (user.preferences?.webhookUrl) {
      tasks.push(
        this.sendWebhook(user.preferences.webhookUrl, {
          event: 'video.completed',
          user: { id: user._id, email: user.email },
          video: { id: video._id, title: video.title, status: video.status }
        }, { event: 'video.completed' })
      );
    }

    await Promise.allSettled(tasks);
  }

  // 通知视频生成失败
  async notifyVideoFailed(user, video) {
    const data = {
      prompt: video.prompt,
      model: video.model,
      errorMessage: video.errorMessage,
      failedAt: video.updatedAt.toLocaleString(),
      refundAmount: video.refundAmount || video.pointsCost,
      retryUrl: `${process.env.FRONTEND_URL}/generate?retry=${video._id}`
    };

    const tasks = [];

    // 发送邮件通知
    if (user.preferences?.emailNotifications) {
      tasks.push(
        this.sendEmail(
          user.email,
          'videoFailed',
          data,
          user.preferences?.language || 'zh-CN'
        )
      );
    }

    // 发送Webhook通知
    if (user.preferences?.webhookUrl) {
      tasks.push(
        this.sendWebhook(user.preferences.webhookUrl, {
          event: 'video.failed',
          user: { id: user._id, email: user.email },
          video: { id: video._id, prompt: video.prompt, error: video.errorMessage }
        }, { event: 'video.failed' })
      );
    }

    await Promise.allSettled(tasks);
  }

  // 通知订阅即将到期
  async notifySubscriptionExpiring(user, daysLeft) {
    const data = {
      subscriptionLevel: user.subscriptionLevel,
      expiryDate: user.subscriptionExpiry.toLocaleDateString(),
      daysLeft,
      renewUrl: `${process.env.FRONTEND_URL}/subscription/renew`
    };

    if (user.preferences?.emailNotifications) {
      await this.sendEmail(
        user.email,
        'subscriptionExpiring',
        data,
        user.preferences?.language || 'zh-CN'
      );
    }
  }

  // 通知账户受限
  async notifyAccountRestricted(user) {
    const data = {
      restrictionReason: user.riskProfile.restrictionReason,
      restrictionDate: new Date().toLocaleDateString(),
      restrictionExpiry: user.riskProfile.restrictionExpiry?.toLocaleDateString(),
      appealUrl: `${process.env.FRONTEND_URL}/account/appeal`
    };

    if (user.preferences?.emailNotifications) {
      await this.sendEmail(
        user.email,
        'accountRestricted',
        data,
        user.preferences?.language || 'zh-CN'
      );
    }
  }

  // 批量发送通知
  async sendBulkNotifications(notifications) {
    const tasks = notifications.map(notification => {
      switch (notification.type) {
        case 'email':
          return this.sendEmail(
            notification.to,
            notification.template,
            notification.data,
            notification.language
          );
        case 'webhook':
          return this.sendWebhook(
            notification.url,
            notification.data,
            notification.options
          );
        default:
          return Promise.resolve(false);
      }
    });

    const results = await Promise.allSettled(tasks);
    return results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled' && result.value,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  // 获取通知统计
  async getNotificationStats(timeRange = '7d') {
    // 这里可以实现通知统计逻辑
    // 例如从数据库中查询发送记录
    return {
      email: {
        sent: 0,
        failed: 0,
        bounced: 0
      },
      webhook: {
        sent: 0,
        failed: 0,
        timeout: 0
      }
    };
  }
}

module.exports = new NotificationService(); 