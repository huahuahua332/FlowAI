const axios = require('axios');
const openaiService = require('./openaiService');

class ModerationService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.azureApiKey = process.env.AZURE_CONTENT_SAFETY_KEY;
    this.azureEndpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT;
  }

  // 审核文本内容（提示词）
  async moderateText(text, language = 'zh-CN') {
    try {
      const results = await Promise.allSettled([
        this.openaiModeration(text),
        this.azureModeration(text, language)
      ]);

      // 合并审核结果
      const moderationResult = {
        flagged: false,
        categories: [],
        confidence: 0,
        details: {},
        reviewedAt: new Date()
      };

      // 处理OpenAI结果
      if (results[0].status === 'fulfilled' && results[0].value) {
        const openaiResult = results[0].value;
        if (openaiResult.flagged) {
          moderationResult.flagged = true;
          moderationResult.categories.push(...Object.keys(openaiResult.categories).filter(cat => openaiResult.categories[cat]));
          moderationResult.details.openai = openaiResult;
        }
      }

      // 处理Azure结果
      if (results[1].status === 'fulfilled' && results[1].value) {
        const azureResult = results[1].value;
        if (azureResult.flagged) {
          moderationResult.flagged = true;
          moderationResult.categories.push(...azureResult.categories);
          moderationResult.confidence = Math.max(moderationResult.confidence, azureResult.confidence);
          moderationResult.details.azure = azureResult;
        }
      }

      return moderationResult;
    } catch (error) {
      console.error('内容审核失败:', error);
      // 审核失败时采用保守策略，允许通过但记录错误
      return {
        flagged: false,
        categories: [],
        confidence: 0,
        error: error.message,
        reviewedAt: new Date()
      };
    }
  }

  // OpenAI内容审核
  async openaiModeration(text) {
    if (!this.openaiApiKey) {
      console.warn('OpenAI API密钥未配置，跳过OpenAI审核');
      return null;
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/moderations',
        { input: text },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.results[0];
      return {
        flagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores
      };
    } catch (error) {
      console.error('OpenAI审核失败:', error);
      return null;
    }
  }

  // Azure内容安全审核
  async azureModeration(text, language = 'zh-CN') {
    if (!this.azureApiKey || !this.azureEndpoint) {
      console.warn('Azure内容安全API未配置，跳过Azure审核');
      return null;
    }

    try {
      const response = await axios.post(
        `${this.azureEndpoint}/contentsafety/text:analyze?api-version=2023-10-01`,
        {
          text: text,
          language: language
        },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;
      const flagged = result.categoriesAnalysis.some(cat => cat.severity > 2);
      const categories = result.categoriesAnalysis
        .filter(cat => cat.severity > 2)
        .map(cat => cat.category);
      
      const maxConfidence = Math.max(...result.categoriesAnalysis.map(cat => cat.severity)) / 6;

      return {
        flagged,
        categories,
        confidence: maxConfidence,
        details: result
      };
    } catch (error) {
      console.error('Azure审核失败:', error);
      return null;
    }
  }

  // 审核视频内容（基于标题和描述）
  async moderateVideo(videoData) {
    const textToModerate = [
      videoData.title,
      videoData.prompt,
      videoData.description
    ].filter(Boolean).join(' ');

    return await this.moderateText(textToModerate);
  }

  // 获取审核状态的本地化文本
  getModerationMessage(moderationResult, language = 'zh-CN') {
    const messages = {
      'zh-CN': {
        flagged: '内容包含不当信息，无法处理',
        categories: {
          'sexual': '包含性相关内容',
          'hate': '包含仇恨言论',
          'harassment': '包含骚扰内容',
          'self-harm': '包含自残内容',
          'sexual/minors': '包含未成年人不当内容',
          'hate/threatening': '包含威胁性仇恨言论',
          'violence/graphic': '包含暴力图像内容',
          'self-harm/intent': '包含自残意图',
          'self-harm/instructions': '包含自残指导',
          'harassment/threatening': '包含威胁性骚扰'
        },
        approved: '内容审核通过',
        rejected: '内容审核未通过',
        reviewing: '内容审核中，请稍候'
      },
      'en-US': {
        flagged: 'Content contains inappropriate information and cannot be processed',
        categories: {
          'sexual': 'Contains sexual content',
          'hate': 'Contains hate speech',
          'harassment': 'Contains harassment',
          'self-harm': 'Contains self-harm content',
          'sexual/minors': 'Contains inappropriate content involving minors',
          'hate/threatening': 'Contains threatening hate speech',
          'violence/graphic': 'Contains graphic violence',
          'self-harm/intent': 'Contains self-harm intent',
          'self-harm/instructions': 'Contains self-harm instructions',
          'harassment/threatening': 'Contains threatening harassment'
        },
        approved: 'Content approved',
        rejected: 'Content rejected',
        reviewing: 'Content under review, please wait'
      }
    };

    const langMessages = messages[language] || messages['zh-CN'];

    if (moderationResult.flagged) {
      const categoryMessages = moderationResult.categories
        .map(cat => langMessages.categories[cat] || cat)
        .join('、');
      
      return `${langMessages.flagged}${categoryMessages ? `：${categoryMessages}` : ''}`;
    }

    return langMessages.approved;
  }

  // 批量审核
  async moderateBatch(texts, language = 'zh-CN') {
    const results = await Promise.allSettled(
      texts.map(text => this.moderateText(text, language))
    );

    return results.map((result, index) => ({
      index,
      text: texts[index],
      result: result.status === 'fulfilled' ? result.value : { 
        flagged: false, 
        error: result.reason?.message || 'Unknown error' 
      }
    }));
  }

  // 获取审核统计
  async getModerationStats(timeRange = '7d') {
    const Video = require('../models/Video');
    
    const timeRanges = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - timeRanges[timeRange]);

    const stats = await Video.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$moderationStatus',
          count: { $sum: 1 },
          flaggedCategories: {
            $push: {
              $cond: [
                { $eq: ['$moderationResult.flagged', true] },
                '$moderationResult.categories',
                null
              ]
            }
          }
        }
      }
    ]);

    return {
      timeRange,
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          flaggedCategories: stat.flaggedCategories.filter(Boolean).flat()
        };
        return acc;
      }, {})
    };
  }
}

module.exports = new ModerationService(); 