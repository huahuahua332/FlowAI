const Replicate = require('replicate');

class ReplicateService {
  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  // Google Veo-3 视频生成 (文本到视频)
  async generateVeo3Video(params) {
    try {
      const { prompt, duration = 5, aspectRatio = "16:9" } = params;
      
      const input = {
        prompt: prompt,
        duration: duration,
        aspect_ratio: aspectRatio
      };

      console.log('开始生成 Veo-3 视频:', input);
      
      const output = await this.replicate.run(process.env.VEO_3_MODEL, { input });
      
      return {
        success: true,
        data: {
          video_url: output,
          model: 'veo-3',
          duration: duration,
          aspect_ratio: aspectRatio
        }
      };
    } catch (error) {
      console.error('Veo-3 生成错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // WAN 2.1 图片到视频生成 (I2V)
  async generateWanI2V(params) {
    try {
      const { image, prompt, duration = 4 } = params;
      
      if (!image) {
        throw new Error('图片参数是必需的');
      }

      const input = {
        image: image,
        prompt: prompt || "A woman is talking",
        duration: duration
      };

      console.log('开始生成 WAN I2V 视频:', { ...input, image: '[图片数据]' });
      
      const output = await this.replicate.run(process.env.WAN_I2V_MODEL, { input });
      
      return {
        success: true,
        data: {
          video_url: output,
          model: 'wan-i2v',
          duration: duration,
          resolution: '480p'
        }
      };
    } catch (error) {
      console.error('WAN I2V 生成错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // WAN 2.1 文本到视频生成 (T2V)
  async generateWanT2V(params) {
    try {
      const { prompt, duration = 4 } = params;
      
      const input = {
        prompt: prompt,
        duration: duration
      };

      console.log('开始生成 WAN T2V 视频:', input);
      
      const output = await this.replicate.run(process.env.WAN_T2V_MODEL, { input });
      
      return {
        success: true,
        data: {
          video_url: output,
          model: 'wan-t2v',
          duration: duration,
          resolution: '720p'
        }
      };
    } catch (error) {
      console.error('WAN T2V 生成错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 统一的视频生成接口
  async generateVideo(modelType, params) {
    switch (modelType) {
      case 'veo-3':
        return await this.generateVeo3Video(params);
      case 'wan-i2v':
        return await this.generateWanI2V(params);
      case 'wan-t2v':
        return await this.generateWanT2V(params);
      default:
        return {
          success: false,
          error: `不支持的模型类型: ${modelType}`
        };
    }
  }

  // 获取预测状态
  async getPredictionStatus(predictionId) {
    try {
      const prediction = await this.replicate.predictions.get(predictionId);
      return {
        success: true,
        data: prediction
      };
    } catch (error) {
      console.error('获取预测状态错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 取消预测
  async cancelPrediction(predictionId) {
    try {
      await this.replicate.predictions.cancel(predictionId);
      return {
        success: true,
        message: '预测已取消'
      };
    } catch (error) {
      console.error('取消预测错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ReplicateService(); 