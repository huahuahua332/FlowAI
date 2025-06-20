const express = require('express');
const HotPrompt = require('../models/HotPrompt');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 获取热门提示词
router.get('/hot', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const category = req.query.category;

    const query = category ? { category } : {};
    
    const hotPrompts = await HotPrompt.find(query)
      .sort({ usageCount: -1, lastUsed: -1 })
      .limit(limit)
      .select('prompt usageCount category tags lastUsed');

    res.json({
      success: true,
      data: {
        prompts: hotPrompts,
        total: hotPrompts.length
      }
    });
  } catch (error) {
    console.error('获取热门提示词错误:', error);
    res.status(500).json({
      success: false,
      message: '获取热门提示词失败'
    });
  }
});

// 获取提示词分类
router.get('/categories', async (req, res) => {
  try {
    const categories = await HotPrompt.distinct('category');
    
    res.json({
      success: true,
      data: {
        categories: categories.filter(cat => cat && cat.trim().length > 0)
      }
    });
  } catch (error) {
    console.error('获取提示词分类错误:', error);
    res.status(500).json({
      success: false,
      message: '获取提示词分类失败'
    });
  }
});

// 搜索提示词
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, category, page = 1, limit = 10 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = {
      $text: { $search: q }
    };
    
    if (category) {
      query.category = category;
    }

    const prompts = await HotPrompt.find(query)
      .sort({ score: { $meta: 'textScore' }, usageCount: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('prompt usageCount category tags lastUsed');

    const total = await HotPrompt.countDocuments(query);

    res.json({
      success: true,
      data: {
        prompts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('搜索提示词错误:', error);
    res.status(500).json({
      success: false,
      message: '搜索提示词失败'
    });
  }
});

// 获取推荐提示词（基于用户历史）
router.get('/recommended', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // 如果用户已登录，可以基于用户历史推荐
    // 这里简化实现，返回最近热门的提示词
    const hotPrompts = await HotPrompt.find()
      .sort({ lastUsed: -1, usageCount: -1 })
      .limit(limit)
      .select('prompt usageCount category tags lastUsed');

    res.json({
      success: true,
      data: {
        prompts: hotPrompts,
        total: hotPrompts.length
      }
    });
  } catch (error) {
    console.error('获取推荐提示词错误:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐提示词失败'
    });
  }
});

// 获取提示词统计信息
router.get('/stats', async (req, res) => {
  try {
    const totalPrompts = await HotPrompt.countDocuments();
    const totalUsage = await HotPrompt.aggregate([
      { $group: { _id: null, total: { $sum: '$usageCount' } } }
    ]);

    const topCategories = await HotPrompt.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, usage: { $sum: '$usageCount' } } },
      { $sort: { usage: -1 } },
      { $limit: 5 }
    ]);

    const recentTrends = await HotPrompt.find()
      .sort({ lastUsed: -1 })
      .limit(10)
      .select('prompt usageCount lastUsed');

    res.json({
      success: true,
      data: {
        totalPrompts,
        totalUsage: totalUsage[0]?.total || 0,
        topCategories,
        recentTrends
      }
    });
  } catch (error) {
    console.error('获取提示词统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取提示词统计失败'
    });
  }
});

module.exports = router; 