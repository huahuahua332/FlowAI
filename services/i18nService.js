class I18nService {
  constructor() {
    this.messages = {
      'zh-CN': {
        // 通用消息
        success: '操作成功',
        error: '操作失败',
        unauthorized: '未授权访问',
        forbidden: '访问被禁止',
        not_found: '资源不存在',
        validation_error: '数据验证失败',
        server_error: '服务器内部错误',
        
        // 用户相关
        user: {
          not_found: '用户不存在',
          login_success: '登录成功',
          logout_success: '退出成功',
          profile_updated: '个人资料已更新',
          insufficient_points: '积分不足',
          account_restricted: '账户已被限制',
          account_banned: '账户已被封禁',
          subscription_expired: '订阅已过期',
          subscription_active: '订阅有效'
        },
        
        // 视频生成相关
        video: {
          generation_started: '视频生成已开始',
          generation_completed: '视频生成完成',
          generation_failed: '视频生成失败',
          generation_timeout: '视频生成超时',
          not_found: '视频不存在',
          processing: '视频处理中',
          refund_success: '积分已退还',
          retry_success: '重试请求已提交',
          download_ready: '视频已准备好下载',
          url_expired: '下载链接已过期'
        },
        
        // 限制和控制
        limits: {
          rate_limit_exceeded: '操作过于频繁，请稍后再试',
          concurrent_limit_exceeded: '并发任务数量已达上限',
          daily_limit_exceeded: '今日生成次数已用完',
          hourly_limit_exceeded: '每小时生成次数已用完',
          wait_seconds: '请等待 {seconds} 秒后再试',
          wait_minutes: '请等待 {minutes} 分钟后再试'
        },
        
        // 内容审核
        moderation: {
          content_flagged: '内容包含不当信息',
          under_review: '内容审核中',
          approved: '内容审核通过',
          rejected: '内容审核未通过',
          sexual_content: '包含性相关内容',
          hate_speech: '包含仇恨言论',
          harassment: '包含骚扰内容',
          violence: '包含暴力内容',
          self_harm: '包含自残内容'
        },
        
        // 支付相关
        payment: {
          success: '支付成功',
          failed: '支付失败',
          pending: '支付处理中',
          cancelled: '支付已取消',
          refunded: '已退款',
          insufficient_funds: '余额不足',
          invalid_card: '银行卡信息无效',
          expired_card: '银行卡已过期'
        },
        
        // 订阅相关
        subscription: {
          upgraded: '订阅已升级',
          downgraded: '订阅已降级',
          cancelled: '订阅已取消',
          renewed: '订阅已续费',
          expiring_soon: '订阅即将到期',
          expired: '订阅已过期',
          invalid_plan: '无效的订阅计划'
        },
        
        // 管理后台
        admin: {
          user_banned: '用户已被封禁',
          user_unbanned: '用户封禁已解除',
          video_deleted: '视频已删除',
          content_approved: '内容已批准',
          content_rejected: '内容已拒绝',
          stats_updated: '统计数据已更新'
        }
      },
      
      'en-US': {
        // Common messages
        success: 'Operation successful',
        error: 'Operation failed',
        unauthorized: 'Unauthorized access',
        forbidden: 'Access forbidden',
        not_found: 'Resource not found',
        validation_error: 'Data validation failed',
        server_error: 'Internal server error',
        
        // User related
        user: {
          not_found: 'User not found',
          login_success: 'Login successful',
          logout_success: 'Logout successful',
          profile_updated: 'Profile updated',
          insufficient_points: 'Insufficient points',
          account_restricted: 'Account restricted',
          account_banned: 'Account banned',
          subscription_expired: 'Subscription expired',
          subscription_active: 'Subscription active'
        },
        
        // Video generation related
        video: {
          generation_started: 'Video generation started',
          generation_completed: 'Video generation completed',
          generation_failed: 'Video generation failed',
          generation_timeout: 'Video generation timeout',
          not_found: 'Video not found',
          processing: 'Video processing',
          refund_success: 'Points refunded',
          retry_success: 'Retry request submitted',
          download_ready: 'Video ready for download',
          url_expired: 'Download link expired'
        },
        
        // Limits and controls
        limits: {
          rate_limit_exceeded: 'Rate limit exceeded, please try again later',
          concurrent_limit_exceeded: 'Concurrent task limit reached',
          daily_limit_exceeded: 'Daily generation limit reached',
          hourly_limit_exceeded: 'Hourly generation limit reached',
          wait_seconds: 'Please wait {seconds} seconds',
          wait_minutes: 'Please wait {minutes} minutes'
        },
        
        // Content moderation
        moderation: {
          content_flagged: 'Content contains inappropriate information',
          under_review: 'Content under review',
          approved: 'Content approved',
          rejected: 'Content rejected',
          sexual_content: 'Contains sexual content',
          hate_speech: 'Contains hate speech',
          harassment: 'Contains harassment',
          violence: 'Contains violent content',
          self_harm: 'Contains self-harm content'
        },
        
        // Payment related
        payment: {
          success: 'Payment successful',
          failed: 'Payment failed',
          pending: 'Payment pending',
          cancelled: 'Payment cancelled',
          refunded: 'Payment refunded',
          insufficient_funds: 'Insufficient funds',
          invalid_card: 'Invalid card information',
          expired_card: 'Card expired'
        },
        
        // Subscription related
        subscription: {
          upgraded: 'Subscription upgraded',
          downgraded: 'Subscription downgraded',
          cancelled: 'Subscription cancelled',
          renewed: 'Subscription renewed',
          expiring_soon: 'Subscription expiring soon',
          expired: 'Subscription expired',
          invalid_plan: 'Invalid subscription plan'
        },
        
        // Admin panel
        admin: {
          user_banned: 'User banned',
          user_unbanned: 'User unbanned',
          video_deleted: 'Video deleted',
          content_approved: 'Content approved',
          content_rejected: 'Content rejected',
          stats_updated: 'Statistics updated'
        }
      },
      
      'ja-JP': {
        // 基本的なメッセージ
        success: '操作が成功しました',
        error: '操作が失敗しました',
        unauthorized: '認証されていません',
        forbidden: 'アクセスが禁止されています',
        not_found: 'リソースが見つかりません',
        validation_error: 'データ検証に失敗しました',
        server_error: 'サーバー内部エラー',
        
        // ユーザー関連
        user: {
          not_found: 'ユーザーが見つかりません',
          login_success: 'ログインに成功しました',
          logout_success: 'ログアウトしました',
          profile_updated: 'プロフィールが更新されました',
          insufficient_points: 'ポイントが不足しています',
          account_restricted: 'アカウントが制限されています',
          account_banned: 'アカウントが禁止されています',
          subscription_expired: 'サブスクリプションが期限切れです',
          subscription_active: 'サブスクリプションが有効です'
        },
        
        // 動画生成関連
        video: {
          generation_started: '動画生成を開始しました',
          generation_completed: '動画生成が完了しました',
          generation_failed: '動画生成に失敗しました',
          generation_timeout: '動画生成がタイムアウトしました',
          not_found: '動画が見つかりません',
          processing: '動画処理中',
          refund_success: 'ポイントが返金されました',
          retry_success: '再試行リクエストが送信されました',
          download_ready: '動画のダウンロード準備完了',
          url_expired: 'ダウンロードリンクが期限切れです'
        }
      },
      
      'ko-KR': {
        // 기본 메시지
        success: '작업이 성공했습니다',
        error: '작업이 실패했습니다',
        unauthorized: '인증되지 않은 접근',
        forbidden: '접근이 금지됨',
        not_found: '리소스를 찾을 수 없습니다',
        validation_error: '데이터 검증 실패',
        server_error: '서버 내부 오류',
        
        // 사용자 관련
        user: {
          not_found: '사용자를 찾을 수 없습니다',
          login_success: '로그인 성공',
          logout_success: '로그아웃 성공',
          profile_updated: '프로필이 업데이트되었습니다',
          insufficient_points: '포인트가 부족합니다',
          account_restricted: '계정이 제한되었습니다',
          account_banned: '계정이 차단되었습니다',
          subscription_expired: '구독이 만료되었습니다',
          subscription_active: '구독이 활성화되어 있습니다'
        },
        
        // 비디오 생성 관련
        video: {
          generation_started: '비디오 생성이 시작되었습니다',
          generation_completed: '비디오 생성이 완료되었습니다',
          generation_failed: '비디오 생성에 실패했습니다',
          generation_timeout: '비디오 생성 시간 초과',
          not_found: '비디오를 찾을 수 없습니다',
          processing: '비디오 처리 중',
          refund_success: '포인트가 환불되었습니다',
          retry_success: '재시도 요청이 제출되었습니다',
          download_ready: '비디오 다운로드 준비 완료',
          url_expired: '다운로드 링크가 만료되었습니다'
        }
      }
    };
  }

  // 获取本地化消息
  getMessage(key, language = 'zh-CN', params = {}) {
    const langMessages = this.messages[language] || this.messages['zh-CN'];
    
    // 支持嵌套键，如 'user.not_found'
    const keys = key.split('.');
    let message = langMessages;
    
    for (const k of keys) {
      if (message && typeof message === 'object' && message[k]) {
        message = message[k];
      } else {
        // 如果找不到对应语言的消息，回退到中文
        const fallbackMessages = this.messages['zh-CN'];
        let fallbackMessage = fallbackMessages;
        for (const k of keys) {
          if (fallbackMessage && typeof fallbackMessage === 'object' && fallbackMessage[k]) {
            fallbackMessage = fallbackMessage[k];
          } else {
            return key; // 如果连中文都没有，返回键名
          }
        }
        message = fallbackMessage;
        break;
      }
    }
    
    if (typeof message !== 'string') {
      return key;
    }
    
    // 替换参数
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  // 获取错误响应
  getErrorResponse(key, language = 'zh-CN', params = {}, statusCode = 400) {
    return {
      success: false,
      error: {
        code: key,
        message: this.getMessage(key, language, params),
        timestamp: new Date().toISOString()
      },
      statusCode
    };
  }

  // 获取成功响应
  getSuccessResponse(key, language = 'zh-CN', data = null, params = {}) {
    const response = {
      success: true,
      message: this.getMessage(key, language, params),
      timestamp: new Date().toISOString()
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    return response;
  }

  // 获取支持的语言列表
  getSupportedLanguages() {
    return Object.keys(this.messages);
  }

  // 检查语言是否支持
  isLanguageSupported(language) {
    return this.messages.hasOwnProperty(language);
  }

  // 获取用户首选语言
  getUserLanguage(req) {
    // 优先级：查询参数 > 用户设置 > Accept-Language 头 > 默认语言
    
    // 1. 查询参数
    if (req.query.lang && this.isLanguageSupported(req.query.lang)) {
      return req.query.lang;
    }
    
    // 2. 用户设置
    if (req.user && req.user.preferences && req.user.preferences.language) {
      return req.user.preferences.language;
    }
    
    // 3. Accept-Language 头
    if (req.headers['accept-language']) {
      const acceptedLanguages = req.headers['accept-language']
        .split(',')
        .map(lang => lang.split(';')[0].trim());
      
      for (const lang of acceptedLanguages) {
        if (this.isLanguageSupported(lang)) {
          return lang;
        }
        
        // 尝试匹配语言代码（如 'en' 匹配 'en-US'）
        const matchedLang = this.getSupportedLanguages().find(supported => 
          supported.startsWith(lang.split('-')[0])
        );
        if (matchedLang) {
          return matchedLang;
        }
      }
    }
    
    // 4. 默认语言
    return 'zh-CN';
  }

  // 中间件：设置请求语言
  middleware() {
    return (req, res, next) => {
      req.language = this.getUserLanguage(req);
      
      // 添加响应帮助方法
      res.success = (key, data = null, params = {}) => {
        const response = this.getSuccessResponse(key, req.language, data, params);
        return res.json(response);
      };
      
      res.error = (key, statusCode = 400, params = {}) => {
        const response = this.getErrorResponse(key, req.language, params, statusCode);
        return res.status(statusCode).json(response);
      };
      
      next();
    };
  }

  // 格式化数字（考虑本地化）
  formatNumber(number, language = 'zh-CN') {
    const locales = {
      'zh-CN': 'zh-CN',
      'en-US': 'en-US',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR'
    };
    
    return new Intl.NumberFormat(locales[language] || 'zh-CN').format(number);
  }

  // 格式化日期（考虑本地化）
  formatDate(date, language = 'zh-CN', options = {}) {
    const locales = {
      'zh-CN': 'zh-CN',
      'en-US': 'en-US',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR'
    };
    
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat(
      locales[language] || 'zh-CN',
      { ...defaultOptions, ...options }
    ).format(new Date(date));
  }

  // 格式化货币（考虑本地化）
  formatCurrency(amount, currency = 'CNY', language = 'zh-CN') {
    const locales = {
      'zh-CN': 'zh-CN',
      'en-US': 'en-US',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR'
    };
    
    return new Intl.NumberFormat(locales[language] || 'zh-CN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}

module.exports = new I18nService(); 