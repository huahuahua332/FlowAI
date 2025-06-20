const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect('mongodb://root:q2lr8xrk@dbconn.sealoshzh.site:44370');
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 为现有用户创建测试视频
async function createVideosForExistingUsers() {
  console.log('🎬 为现有用户创建测试视频...');
  
  // 获取所有现有用户
  const users = await User.find().limit(10);
  console.log(`找到 ${users.length} 个用户`);

  const videoPrompts = [
    '一只可爱的小猫在花园里玩耍',
    '科幻城市的未来景象，霓虹灯闪烁',
    '海边日落，波浪轻拍沙滩',
    '森林中的小溪流水潺潺',
    '宇宙中的星系旋转',
    '雨后的彩虹出现在天空',
    '古代城堡在山顶矗立',
    '机器人在工厂中工作',
    '蝴蝶在花丛中飞舞',
    '雪山上的滑雪者',
    '城市夜景，车流如织',
    '花园中的蜜蜂采蜜',
    '海豚在海洋中跳跃',
    '火山爆发的壮观景象',
    '极光在夜空中舞动'
  ];

  const models = ['veo-3', 'wan-i2v', 'wan-t2v'];
  const statuses = ['completed', 'processing', 'pending', 'failed'];
  const durations = [5, 10];

  const testVideos = [];
  
  // 为每个用户创建3-8个随机视频
  for (const user of users) {
    const videoCount = Math.floor(Math.random() * 6) + 3; // 3-8个视频
    
    for (let i = 0; i < videoCount; i++) {
      const prompt = videoPrompts[Math.floor(Math.random() * videoPrompts.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = durations[Math.floor(Math.random() * durations.length)];
      
      const videoData = {
        title: `${prompt.substring(0, 20)}...`,
        prompt,
        model,
        duration,
        status,
        userId: user._id,
        pointsCost: duration === 5 ? 10 : 20,
        parameters: {
          aspectRatio: '16:9',
          fps: 24,
          quality: 'medium'
        }
      };

      // 设置时间 - 最近30天内
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      videoData.createdAt = createdAt;

      if (status === 'processing' || status === 'completed' || status === 'failed') {
        videoData.processingStartedAt = new Date(createdAt.getTime() + Math.random() * 60000);
      }

      if (status === 'completed') {
        videoData.processingCompletedAt = new Date(videoData.processingStartedAt.getTime() + Math.random() * 300000);
        videoData.videoUrl = `https://example.com/videos/video_${Date.now()}_${i}.mp4`;
        videoData.thumbnailUrl = `https://example.com/thumbnails/thumb_${Date.now()}_${i}.jpg`;
      }

      if (status === 'failed') {
        videoData.processingCompletedAt = new Date(videoData.processingStartedAt.getTime() + Math.random() * 60000);
        const errors = [
          '生成失败：服务器繁忙，请稍后重试',
          '生成失败：内容不符合社区准则',
          '生成失败：网络超时',
          '生成失败：模型服务暂时不可用'
        ];
        videoData.errorMessage = errors[Math.floor(Math.random() * errors.length)];
      }

      testVideos.push(videoData);
    }
  }

  // 批量插入视频
  if (testVideos.length > 0) {
    const createdVideos = await Video.insertMany(testVideos);
    console.log(`✅ 为现有用户创建了 ${createdVideos.length} 个测试视频`);
    
    // 按用户分组显示统计
    const userStats = {};
    for (const video of createdVideos) {
      const userId = video.userId.toString();
      if (!userStats[userId]) userStats[userId] = 0;
      userStats[userId]++;
    }
    
    console.log('\n📊 每个用户的视频数量:');
    for (const user of users) {
      const count = userStats[user._id.toString()] || 0;
      if (count > 0) {
        console.log(`   ${user.name} (${user.email}): ${count} 个视频`);
      }
    }
  }

  return testVideos;
}

// 主函数
async function main() {
  console.log('🚀 开始为现有用户创建测试视频...\n');
  
  try {
    await connectDB();
    
    await createVideosForExistingUsers();
    console.log('');
    
    console.log('🎉 测试视频创建完成！');
    
    // 显示统计信息
    const userCount = await User.countDocuments();
    const videoCount = await Video.countDocuments();
    
    console.log('\n📊 数据统计:');
    console.log(`   用户数量: ${userCount}`);
    console.log(`   视频数量: ${videoCount}`);
    
  } catch (error) {
    console.error('❌ 创建失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
}

// 运行脚本
if (require.main === module) {
  main();
} 