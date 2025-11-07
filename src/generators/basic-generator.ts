import { BaseGenerator } from './base-generator.js';
import { ExcelConfig } from '../types/schema.js';

export class BasicGenerator extends BaseGenerator {
  async generate(config: ExcelConfig): Promise<Buffer> {
    // Set workbook metadata
    if (config.metadata) {
      this.workbook.creator = config.metadata.author || 'AI Assistant';
      if (config.metadata.title) this.workbook.title = config.metadata.title;
      if (config.metadata.subject) this.workbook.subject = config.metadata.subject;
      if (config.metadata.description) this.workbook.description = config.metadata.description;
      if (config.metadata.company) this.workbook.company = config.metadata.company;
      this.workbook.created = new Date();
      this.workbook.modified = new Date();
    }

    // Create sheets
    for (const sheetConfig of config.sheets) {
      await this.createSheet(sheetConfig);
    }

    // Generate buffer
    return await this.generateBuffer();
  }
}
