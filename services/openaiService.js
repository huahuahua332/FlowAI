const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // 生成英文标题
  async generateTitle(prompt) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a creative video title generator. Generate engaging, concise English titles for videos based on the given prompt. The title should be catchy, descriptive, and suitable for social media sharing. Keep it under 60 characters.'
          },
          {
            role: 'user',
            content: `Generate an engaging English title for a video with this prompt: "${prompt}"`
          }
        ],
        max_tokens: 50,
        temperature: 0.8
      });

      return response.choices[0]?.message?.content?.trim() || 'Generated Video';
    } catch (error) {
      console.error('OpenAI 标题生成错误:', error);
      return 'Generated Video';
    }
  }

  // 生成视频描述
  async generateDescription(prompt, title) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a video description writer. Create engaging, SEO-friendly descriptions for videos based on the title and original prompt. Include relevant hashtags and keep it under 200 words.'
          },
          {
            role: 'user',
            content: `Create a description for a video titled "${title}" based on this prompt: "${prompt}"`
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('OpenAI 描述生成错误:', error);
      return '';
    }
  }

  // 优化提示词
  async optimizePrompt(originalPrompt) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI video generation prompt optimizer. Enhance the given prompt to make it more detailed, visually descriptive, and suitable for AI video generation. Focus on visual elements, camera movements, lighting, and atmosphere.'
          },
          {
            role: 'user',
            content: `Optimize this video generation prompt: "${originalPrompt}"`
          }
        ],
        max_tokens: 150,
        temperature: 0.6
      });

      return response.choices[0]?.message?.content?.trim() || originalPrompt;
    } catch (error) {
      console.error('OpenAI 提示词优化错误:', error);
      return originalPrompt;
    }
  }

  // 分析内容安全性
  async moderateContent(text) {
    try {
      const response = await this.openai.moderations.create({
        input: text
      });

      const result = response.results[0];
      return {
        safe: !result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores
      };
    } catch (error) {
      console.error('OpenAI 内容审核错误:', error);
      return { safe: true, categories: {}, categoryScores: {} };
    }
  }
}

module.exports = new OpenAIService(); 