const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const checkPoints = require('../middleware/checkPoints');
const videoService = require('../services/videoService');
const openaiService = require('../services/openaiService');

const router = express.Router();

// 验证规则
const generateValidation = [
  body('prompt')
    .notEmpty()
    .withMessage('提示词不能为空')
    .isLength({ min: 5, max: 500 })
    .withMessage('提示词长度应在 5-500 字符之间'),
  body('duration')
    .optional()
    .isIn([5, 10])
    .withMessage('视频时长只能是 5 或 10 秒'),
  body('resolution')
    .optional()
    .isIn(['480p', '720p', '1080p'])
    .withMessage('分辨率参数无效'),
  body('style')
    .optional()
    .isArray()
    .withMessage('风格参数必须是数组'),
  body('batchSize')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('批量生成数量必须在 1-4 之间')
];

// 统一视频生成端点 - 支持所有模型
router.post('/video', 
  authenticateToken,
  [
    ...generateValidation,
    body('model')
      .notEmpty()
      .withMessage('模型不能为空')
      .isIn(['wan-i2v', 'wan-t2v', 'veo-3'])
      .withMessage('不支持的模型类型'),
    body('image')
      .if(body('model').equals('wan-i2v'))
      .notEmpty()
      .withMessage('图片转视频需要提供图片参数')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入参数错误',
          errors: errors.array()
        });
      }

      const { model, prompt, image, duration = 5, batchSize = 1 } = req.body;

      // 内容安全检查
      const moderation = await openaiService.moderateContent(prompt);
      if (!moderation.safe) {
        return res.status(400).json({
          success: false,
          message: '提示词包含不当内容，请修改后重试'
        });
      }

      // 设置生成类型
      req.body.generationType = model;
      
      // 执行积分检查中间件
      checkPoints(req, res, async () => {
        try {
          const result = await videoService.processVideoGeneration(
            req.user._id,
            req.body,
            model,
            req.requiredPoints,
            req.singleVideoPoints
          );

          res.json(result);
        } catch (error) {
          console.error(`${model} 生成错误:`, error);
          res.status(500).json({
            success: false,
            message: '视频生成失败，请稍后重试'
          });
        }
      });
    } catch (error) {
      console.error('视频生成接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// Google Veo-3 视频生成
router.post('/veo-3',
  authenticateToken,
  generateValidation,
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入参数错误',
          errors: errors.array()
        });
      }

      // 内容安全检查
      const moderation = await openaiService.moderateContent(req.body.prompt);
      if (!moderation.safe) {
        return res.status(400).json({
          success: false,
          message: '提示词包含不当内容，请修改后重试'
        });
      }

      // 设置生成类型
      req.body.generationType = 'veo-3';
      
      // 执行积分检查中间件
      checkPoints(req, res, async () => {
        try {
          const result = await videoService.processVideoGeneration(
            req.user._id,
            req.body,
            'veo-3',
            req.requiredPoints,
            req.singleVideoPoints
          );

          res.json(result);
        } catch (error) {
          console.error('Veo-3 生成错误:', error);
          res.status(500).json({
            success: false,
            message: '视频生成失败，请稍后重试'
          });
        }
      });
    } catch (error) {
      console.error('Veo-3 接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// WAN I2V 图片转视频生成
router.post('/wan-i2v',
  authenticateToken,
  generateValidation,
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入参数错误',
          errors: errors.array()
        });
      }

      // 检查是否提供了图片
      if (!req.body.image) {
        return res.status(400).json({
          success: false,
          message: 'WAN I2V 需要提供图片参数'
        });
      }

      // 内容安全检查
      if (req.body.prompt) {
        const moderation = await openaiService.moderateContent(req.body.prompt);
        if (!moderation.safe) {
          return res.status(400).json({
            success: false,
            message: '提示词包含不当内容，请修改后重试'
          });
        }
      }

      // 设置生成类型
      req.body.generationType = 'wan-i2v';
      
      // 执行积分检查中间件
      checkPoints(req, res, async () => {
        try {
          const result = await videoService.processVideoGeneration(
            req.user._id,
            req.body,
            'wan-i2v',
            req.requiredPoints,
            req.singleVideoPoints
          );

          res.json(result);
        } catch (error) {
          console.error('WAN I2V 生成错误:', error);
          res.status(500).json({
            success: false,
            message: '视频生成失败，请稍后重试'
          });
        }
      });
    } catch (error) {
      console.error('WAN I2V 接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// WAN T2V 文本转视频生成
router.post('/wan-t2v',
  authenticateToken,
  generateValidation,
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入参数错误',
          errors: errors.array()
        });
      }

      // 内容安全检查
      const moderation = await openaiService.moderateContent(req.body.prompt);
      if (!moderation.safe) {
        return res.status(400).json({
          success: false,
          message: '提示词包含不当内容，请修改后重试'
        });
      }

      // 设置生成类型
      req.body.generationType = 'wan-t2v';
      
      // 执行积分检查中间件
      checkPoints(req, res, async () => {
        try {
          const result = await videoService.processVideoGeneration(
            req.user._id,
            req.body,
            'wan-t2v',
            req.requiredPoints,
            req.singleVideoPoints
          );

          res.json(result);
        } catch (error) {
          console.error('WAN T2V 生成错误:', error);
          res.status(500).json({
            success: false,
            message: '视频生成失败，请稍后重试'
          });
        }
      });
    } catch (error) {
      console.error('WAN T2V 接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 获取视频生成状态
router.get('/status/:videoId', authenticateToken, async (req, res) => {
  try {
    const result = await videoService.getVideoById(req.params.videoId, req.user._id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: {
        videoId: result.data._id,
        status: result.data.status,
        progress: result.data.status === 'processing' ? 50 : 
                 result.data.status === 'completed' ? 100 : 0,
        videoUrl: result.data.videoUrl,
        thumbnailUrl: result.data.thumbnailUrl,
        coverUrl: result.data.coverUrl,
        title: result.data.title,
        errorMessage: result.data.errorMessage
      }
    });
  } catch (error) {
    console.error('获取视频状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取视频状态失败'
    });
  }
});

// 获取用户视频列表
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await videoService.getUserVideos(req.user._id, page, limit);
    
    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('获取视频历史错误:', error);
    res.status(500).json({
      success: false,
      message: '获取视频历史失败'
    });
  }
});

// 优化提示词
router.post('/optimize-prompt', authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '提示词不能为空'
      });
    }

    const optimizedPrompt = await openaiService.optimizePrompt(prompt);
    
    res.json({
      success: true,
      data: {
        originalPrompt: prompt,
        optimizedPrompt
      }
    });
  } catch (error) {
    console.error('提示词优化错误:', error);
    res.status(500).json({
      success: false,
      message: '提示词优化失败'
    });
  }
});

module.exports = router; 