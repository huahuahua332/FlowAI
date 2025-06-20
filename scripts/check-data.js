const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');

async function check() {
  try {
    await mongoose.connect('mongodb://root:q2lr8xrk@dbconn.sealoshzh.site:44370');
    
    const users = await User.find().select('_id name email').limit(5);
    console.log('实际用户:');
    users.forEach(u => console.log(`  ${u.name} (${u.email}) - ID: ${u._id}`));
    
    const videos = await Video.find().populate('userId', 'name email').limit(5);
    console.log('\n实际视频:');
    videos.forEach(v => console.log(`  ${v.title} - 用户: ${v.userId ? v.userId.name : '未知'} - ID: ${v._id}`));
    
    const videoCount = await Video.countDocuments();
    const userCount = await User.countDocuments();
    console.log(`\n统计: ${userCount} 个用户, ${videoCount} 个视频`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('错误:', error);
  }
}

check(); 