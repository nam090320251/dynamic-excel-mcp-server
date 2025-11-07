import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export class LocalStorage {
  private storagePath: string;

  constructor() {
    this.storagePath = process.env.DEV_STORAGE_PATH || './temp-files';
    this.ensureDirectory();
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
    }
  }

  async upload(buffer: Buffer, fileName: string): Promise<string> {
    const filePath = path.join(this.storagePath, `${Date.now()}_${fileName}`);

    try {
      await fs.writeFile(filePath, buffer);
      logger.info(`File saved locally: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Local file save failed:', error);
      throw new Error(`Failed to save file locally: ${error}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    // In development, return file path
    // In production with a web server, return HTTP URL
    return `file://${path.resolve(filePath)}`;
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info(`File deleted: ${filePath}`);
    } catch (error) {
      logger.error('File deletion failed:', error);
    }
  }
}
