import AWS from 'aws-sdk';
import { logger } from '../utils/logger.js';

export class S3Storage {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-southeast-1',
    });

    this.bucket = process.env.S3_BUCKET || '';

    if (!this.bucket) {
      throw new Error('S3_BUCKET environment variable is required');
    }
  }

  async upload(buffer: Buffer, fileName: string): Promise<string> {
    const key = `excel-reports/${Date.now()}_${fileName}`;

    try {
      await this.s3.upload({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ContentDisposition: `attachment; filename="${fileName}"`,
      }).promise();

      logger.info(`File uploaded to S3: ${key}`);

      return key;
    } catch (error) {
      logger.error('S3 upload failed:', error);
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const url = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn,
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL:', error);
      throw new Error(`Failed to generate download URL: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key,
      }).promise();

      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('S3 delete failed:', error);
      throw new Error(`Failed to delete file from S3: ${error}`);
    }
  }
}
