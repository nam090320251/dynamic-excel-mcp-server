import ExcelJS from 'exceljs';
import { ExcelConfig, SheetConfig, ColumnConfig } from '../types/schema.js';
import { CellFormatter } from '../formatters/cell-formatter.js';
import { StyleFormatter } from '../formatters/style-formatter.js';

export abstract class BaseGenerator {
  protected workbook: ExcelJS.Workbook;
  protected cellFormatter: CellFormatter;
  protected styleFormatter: StyleFormatter;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.cellFormatter = new CellFormatter();
    this.styleFormatter = new StyleFormatter();
  }

  abstract generate(config: ExcelConfig): Promise<Buffer>;

  protected async createSheet(sheetConfig: SheetConfig): Promise<ExcelJS.Worksheet> {
    const worksheet = this.workbook.addWorksheet(sheetConfig.name);

    // Setup columns
    worksheet.columns = sheetConfig.columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // Apply header styling
    this.applyHeaderStyle(worksheet, sheetConfig.columns);

    // Add data rows
    await this.addDataRows(worksheet, sheetConfig);

    // Apply formatting
    if (sheetConfig.formatting) {
      await this.applyFormatting(worksheet, sheetConfig);
    }

    // Add charts
    if (sheetConfig.charts) {
      await this.addCharts(worksheet, sheetConfig.charts);
    }

    return worksheet;
  }

  protected applyHeaderStyle(worksheet: ExcelJS.Worksheet, columns: ColumnConfig[]) {
    const headerRow = worksheet.getRow(1);

    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Apply custom column styles if provided
    columns.forEach((col, index) => {
      if (col.style) {
        const cell = headerRow.getCell(index + 1);
        this.styleFormatter.applyStyle(cell, col.style);
      }
    });
  }

  protected async addDataRows(worksheet: ExcelJS.Worksheet, sheetConfig: SheetConfig) {
    for (const rowData of sheetConfig.data) {
      const row = worksheet.addRow(rowData);

      // Apply cell formatting based on column configuration
      sheetConfig.columns.forEach((col, colIndex) => {
        const cell = row.getCell(colIndex + 1);

        // Apply number format
        if (col.format) {
          cell.numFmt = col.format;
        } else if (col.type) {
          cell.numFmt = this.cellFormatter.getDefaultFormat(col.type);
        }

        // Apply cell style
        if (col.style) {
          this.styleFormatter.applyStyle(cell, col.style);
        }

        // Apply data validation
        if (col.validation) {
          cell.dataValidation = col.validation as any;
        }
      });
    }
  }

  protected async applyFormatting(worksheet: ExcelJS.Worksheet, sheetConfig: SheetConfig) {
    const fmt = sheetConfig.formatting!;

    // Freeze panes
    if (fmt.freeze_panes) {
      const cell = fmt.freeze_panes;
      const col = cell.charCodeAt(0) - 64;
      const row = parseInt(cell.substring(1));
      worksheet.views = [{
        state: 'frozen',
        xSplit: col > 1 ? col - 1 : 0,
        ySplit: row > 1 ? row - 1 : 0,
      }];
    }

    // Auto filter
    if (fmt.auto_filter) {
      const lastCol = String.fromCharCode(65 + sheetConfig.columns.length - 1);
      worksheet.autoFilter = {
        from: 'A1',
        to: `${lastCol}1`,
      };
    }

    // Page setup
    if (fmt.page_setup) {
      worksheet.pageSetup = fmt.page_setup as any;
    }

    // Header & Footer
    if (fmt.header_footer) {
      worksheet.headerFooter = fmt.header_footer as any;
    }

    // Protection
    if (fmt.protection?.sheet) {
      await worksheet.protect(fmt.protection.password || '', fmt.protection as any);
    }

    // Totals row
    if (fmt.totals_row) {
      const totalRow = worksheet.addRow({});
      Object.entries(fmt.totals_row).forEach(([key, formula]) => {
        const colIndex = sheetConfig.columns.findIndex(c => c.key === key);
        if (colIndex >= 0) {
          const cell = totalRow.getCell(colIndex + 1);
          cell.value = { formula: formula as string };
          cell.font = { bold: true };
        }
      });
    }

    // Conditional formatting
    if (fmt.conditional_formatting) {
      fmt.conditional_formatting.forEach(rule => {
        worksheet.addConditionalFormatting({
          ref: rule.range,
          rules: [rule as any],
        });
      });
    }

    // Merged cells
    if (fmt.merged_cells) {
      fmt.merged_cells.forEach(range => {
        worksheet.mergeCells(range);
      });
    }

    // Row heights
    if (fmt.row_heights) {
      Object.entries(fmt.row_heights).forEach(([rowNum, height]) => {
        worksheet.getRow(parseInt(rowNum)).height = height;
      });
    }

    // Hidden rows/columns
    if (fmt.hidden_rows) {
      fmt.hidden_rows.forEach(rowNum => {
        worksheet.getRow(rowNum).hidden = true;
      });
    }

    if (fmt.hidden_columns) {
      fmt.hidden_columns.forEach(col => {
        worksheet.getColumn(col).hidden = true;
      });
    }

    // Grouped rows
    if (fmt.grouped_rows) {
      fmt.grouped_rows.forEach(group => {
        worksheet.getRows(group.start, group.end - group.start + 1)?.forEach(row => {
          row.outlineLevel = 1;
        });
      });
    }
  }

  protected async addCharts(worksheet: ExcelJS.Worksheet, charts: any[]) {
    // Note: ExcelJS has limited chart support
    // For full chart support, consider using a different library or
    // generating charts as images
    console.warn('Chart generation not fully implemented in ExcelJS');
  }

  protected async generateBuffer(): Promise<Buffer> {
    const buffer = await this.workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
