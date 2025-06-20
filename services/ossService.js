const OSS = require('ali-oss');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');

class OSSService {
  constructor() {
    this.client = new OSS({
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET
    });
  }

  // 从 URL 上传文件到 OSS
  async uploadFromUrl(url, folder = '') {
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
      
      const result = await this.client.putStream(fileName, response.data);
      return result.url;
    } catch (error) {
      console.error('OSS 上传错误:', error);
      throw error;
    }
  }

  // 上传 Buffer 到 OSS
  async uploadBuffer(buffer, fileName, folder = '') {
    try {
      const fullPath = folder ? `${folder}/${fileName}` : fileName;
      const result = await this.client.put(fullPath, buffer);
      return result.url;
    } catch (error) {
      console.error('OSS Buffer 上传错误:', error);
      throw error;
    }
  }

  // 生成视频缩略图
  async generateThumbnail(videoUrl, title) {
    try {
      // 这里应该实现视频首帧截图的逻辑
      // 简化实现，创建一个带标题的图片
      const width = 1280;
      const height = 720;
      
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad1)"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" 
                fill="white" text-anchor="middle" dominant-baseline="middle">
            ${title || '视频封面'}
          </text>
        </svg>
      `;

      const buffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

      const fileName = `${Date.now()}_cover.png`;
      return await this.uploadBuffer(buffer, fileName, 'covers');
    } catch (error) {
      console.error('缩略图生成错误:', error);
      return '';
    }
  }

  // 删除文件
  async deleteFile(fileName) {
    try {
      await this.client.delete(fileName);
      return true;
    } catch (error) {
      console.error('OSS 删除文件错误:', error);
      return false;
    }
  }

  // 获取文件签名 URL
  async getSignedUrl(fileName, expires = 3600) {
    try {
      return this.client.signatureUrl(fileName, { expires });
    } catch (error) {
      console.error('获取签名 URL 错误:', error);
      return null;
    }
  }
}

module.exports = new OSSService(); 