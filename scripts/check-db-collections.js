const mongoose = require('mongoose');

async function checkDatabases() {
  try {
    // 连接到默认数据库
    await mongoose.connect('mongodb://root:q2lr8xrk@dbconn.sealoshzh.site:44370');
    
    const db = mongoose.connection.db;
    console.log('当前连接的数据库:', db.databaseName);
    
    // 列出当前数据库的集合
    const collections = await db.listCollections().toArray();
    console.log('当前数据库的集合:', collections.map(c => c.name));
    
    // 列出所有数据库
    const admin = db.admin();
    const dbs = await admin.listDatabases();
    console.log('\n所有数据库:');
    dbs.databases.forEach(d => {
      console.log(`  ${d.name} (${(d.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    await mongoose.connection.close();
    
    // 尝试连接到 video_generation 数据库
    console.log('\n尝试连接到 video_generation 数据库...');
    await mongoose.connect('mongodb://root:q2lr8xrk@dbconn.sealoshzh.site:44370/video_generation');
    
    const db2 = mongoose.connection.db;
    console.log('连接的数据库:', db2.databaseName);
    
    const collections2 = await db2.listCollections().toArray();
    console.log('video_generation 数据库的集合:', collections2.map(c => c.name));
    
    // 检查每个集合的文档数量
    for (const coll of collections2) {
      const count = await db2.collection(coll.name).countDocuments();
      console.log(`  ${coll.name}: ${count} 个文档`);
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('错误:', error);
  }
}

checkDatabases(); 