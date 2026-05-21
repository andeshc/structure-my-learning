const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');

let s3 = null;

function getClient() {
  if (!s3) {
    s3 = new S3Client({
      endpoint: `https://s3.${config.b2BucketRegion}.backblazeb2.com`,
      region: config.b2BucketRegion,
      credentials: {
        accessKeyId: config.b2KeyId,
        secretAccessKey: config.b2AppKey,
      },
    });
  }
  return s3;
}

function isConfigured() {
  return Boolean(config.b2BucketName && config.b2KeyId && config.b2AppKey && config.cdnUrl);
}

async function uploadImage(buffer, key) {
  await getClient().send(new PutObjectCommand({
    Bucket: config.b2BucketName,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
  }));
  return `${config.cdnUrl}/${key}`;
}

module.exports = { uploadImage, isConfigured };
