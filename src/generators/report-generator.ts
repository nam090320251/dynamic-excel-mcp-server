import { BaseGenerator } from './base-generator.js';
import { ExcelConfig, SheetConfig } from '../types/schema.js';
import ExcelJS from 'exceljs';

export class ReportGenerator extends BaseGenerator {
  async generate(config: ExcelConfig): Promise<Buffer> {
    // Set metadata
    if (config.metadata) {
      this.workbook.creator = config.metadata.author || 'AI Assistant';
      if (config.metadata.title) this.workbook.title = config.metadata.title;
      this.workbook.created = new Date();
    }

    // Create sheets with enhanced styling
    for (const sheetConfig of config.sheets) {
      const worksheet = await this.createEnhancedSheet(sheetConfig);
      await this.addReportHeader(worksheet, sheetConfig);
    }

    return await this.generateBuffer();
  }

  private async createEnhancedSheet(sheetConfig: SheetConfig): Promise<ExcelJS.Worksheet> {
    const worksheet = await this.createSheet(sheetConfig);

    // Add zebra striping for better readability
    this.applyZebraStriping(worksheet, sheetConfig);

    return worksheet;
  }

  private async addReportHeader(worksheet: ExcelJS.Worksheet, sheetConfig: SheetConfig) {
    // Insert title row at the top
    if (sheetConfig.metadata?.title) {
      worksheet.spliceRows(1, 0, [sheetConfig.metadata.title]);
      const titleRow = worksheet.getRow(1);
      titleRow.font = { size: 16, bold: true };
      titleRow.alignment = { horizontal: 'center' };

      // Merge cells for title
      const lastCol = String.fromCharCode(65 + sheetConfig.columns.length - 1);
      worksheet.mergeCells(`A1:${lastCol}1`);

      // Add date
      worksheet.spliceRows(2, 0, [`Generated: ${new Date().toLocaleDateString()}`]);
      worksheet.mergeCells(`A2:${lastCol}2`);

      // Insert blank row
      worksheet.spliceRows(3, 0, []);
    }
  }

  private applyZebraStriping(worksheet: ExcelJS.Worksheet, sheetConfig: SheetConfig) {
    const startRow = 2; // After header
    const endRow = startRow + sheetConfig.data.length;

    for (let i = startRow; i < endRow; i++) {
      if (i % 2 === 0) {
        const row = worksheet.getRow(i);
        sheetConfig.columns.forEach((_, colIndex) => {
          const cell = row.getCell(colIndex + 1);
          if (!cell.fill || (cell.fill as any).type !== 'pattern') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' },
            };
          }
        });
      }
    }
  }
}
