const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Config = new S3Client({
  region: process.env.REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = { s3Config };
