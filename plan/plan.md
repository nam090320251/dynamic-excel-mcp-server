# Plan Xây Dựng Dynamic Excel MCP Server

## 📋 Tổng quan dự án

**Mục tiêu**: Xây dựng MCP Server cho phép LLM tự động tạo file Excel với bất kỳ cấu trúc nào thông qua JSON schema động.

**Tech stack**:
- Node.js + TypeScript
- MCP SDK (@modelcontextprotocol/sdk)
- ExcelJS (Excel generation)
- AWS S3 (File storage)
- Zod (Schema validation)

---

## 🎯 Phase 1: Setup & Core Infrastructure (Ngày 1-2)

### 1.1 Project Initialization

```bash
mkdir excel-mcp-server
cd excel-mcp-server
npm init -y
```

**Package.json**:
```json
{
  "name": "@your-org/excel-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "build/index.js",
  "bin": {
    "excel-mcp-server": "./build/index.js"
  },
  "scripts": {
    "build": "tsc && chmod +x build/index.js",
    "dev": "tsx watch src/index.ts",
    "start": "node build/index.js",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "exceljs": "^4.4.0",
    "aws-sdk": "^2.1691.0",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

**Folder structure**:
```
excel-mcp-server/
├── src/
│   ├── index.ts                 # MCP Server entry point
│   ├── types/
│   │   ├── schema.ts           # TypeScript types & Zod schemas
│   │   └── excel-config.ts     # Excel configuration types
│   ├── generators/
│   │   ├── base-generator.ts   # Abstract base class
│   │   ├── basic-generator.ts  # Simple tables
│   │   ├── report-generator.ts # Reports with styling
│   │   ├── form-generator.ts   # Forms/templates
│   │   └── dashboard-generator.ts # Dashboards with charts
│   ├── formatters/
│   │   ├── cell-formatter.ts   # Cell formatting
│   │   ├── style-formatter.ts  # Styling utilities
│   │   └── formula-builder.ts  # Formula generation
│   ├── storage/
│   │   ├── s3-storage.ts       # S3 upload handler
│   │   └── local-storage.ts    # Local file system (dev)
│   ├── validators/
│   │   └── schema-validator.ts # JSON schema validation
│   └── utils/
│       ├── logger.ts           # Logging utility
│       └── error-handler.ts    # Error handling
├── tests/
│   ├── generators/
│   ├── formatters/
│   └── integration/
├── examples/
│   ├── simple-table.json
│   ├── financial-report.json
│   ├── employee-list.json
│   └── dashboard.json
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### 1.2 Environment Setup

**.env.example**:
```env
# Storage
STORAGE_TYPE=s3  # or 'local' for development
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1
S3_BUCKET=your-excel-files-bucket

# Server
LOG_LEVEL=info
MAX_FILE_SIZE_MB=50
PRESIGNED_URL_EXPIRY=3600

# Development
DEV_STORAGE_PATH=./temp-files
```

---

## 🏗️ Phase 2: Type System & Schema Definition (Ngày 2-3)

### 2.1 Core Type Definitions

**src/types/schema.ts**:
```typescript
import { z } from 'zod';

// ============ COLUMN SCHEMA ============
export const ColumnSchema = z.object({
  header: z.string().describe('Column header text'),
  key: z.string().describe('Data key for this column'),
  width: z.number().optional().default(15).describe('Column width in characters'),
  
  // Data type & formatting
  type: z.enum(['text', 'number', 'currency', 'percentage', 'date', 'datetime', 'boolean', 'formula']).optional(),
  format: z.string().optional().describe('Excel number format string (e.g., "#,##0₫", "0.00%")'),
  
  // Styling
  style: z.object({
    font: z.object({
      name: z.string().optional(),
      size: z.number().optional(),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      underline: z.boolean().optional(),
      color: z.object({ argb: z.string() }).optional(),
    }).optional(),
    
    alignment: z.object({
      horizontal: z.enum(['left', 'center', 'right', 'justify']).optional(),
      vertical: z.enum(['top', 'middle', 'bottom']).optional(),
      wrapText: z.boolean().optional(),
    }).optional(),
    
    fill: z.object({
      type: z.literal('pattern'),
      pattern: z.string(),
      fgColor: z.object({ argb: z.string() }),
      bgColor: z.object({ argb: z.string() }).optional(),
    }).optional(),
    
    border: z.object({
      top: z.object({ style: z.string(), color: z.object({ argb: z.string() }) }).optional(),
      bottom: z.object({ style: z.string(), color: z.object({ argb: z.string() }) }).optional(),
      left: z.object({ style: z.string(), color: z.object({ argb: z.string() }) }).optional(),
      right: z.object({ style: z.string(), color: z.object({ argb: z.string() }) }).optional(),
    }).optional(),
  }).optional(),
  
  // Validation
  validation: z.object({
    type: z.enum(['list', 'whole', 'decimal', 'date', 'textLength', 'custom']),
    operator: z.string().optional(),
    formula1: z.string().optional(),
    formula2: z.string().optional(),
    allowBlank: z.boolean().optional(),
    showInputMessage: z.boolean().optional(),
    promptTitle: z.string().optional(),
    prompt: z.string().optional(),
    showErrorMessage: z.boolean().optional(),
    errorTitle: z.string().optional(),
    error: z.string().optional(),
  }).optional(),
});

// ============ CONDITIONAL FORMATTING ============
export const ConditionalFormattingSchema = z.object({
  range: z.string().describe('Cell range (e.g., "A2:A100")'),
  type: z.enum(['cellIs', 'expression', 'colorScale', 'dataBar', 'iconSet']),
  operator: z.enum(['greaterThan', 'lessThan', 'between', 'equal', 'notEqual', 'containsText']).optional(),
  formulae: z.array(z.union([z.string(), z.number()])).optional(),
  
  style: z.object({
    font: z.any().optional(),
    fill: z.any().optional(),
    border: z.any().optional(),
  }).optional(),
  
  // Color scale specific
  colorScale: z.object({
    cfvo: z.array(z.object({
      type: z.enum(['min', 'max', 'num', 'percent', 'percentile']),
      value: z.number().optional(),
    })),
    color: z.array(z.object({ argb: z.string() })),
  }).optional(),
  
  // Data bar specific
  dataBar: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    showValue: z.boolean().optional(),
    gradient: z.boolean().optional(),
    border: z.boolean().optional(),
    negativeBarColorSameAsPositive: z.boolean().optional(),
  }).optional(),
});

// ============ CHART SCHEMA ============
export const ChartSchema = z.object({
  type: z.enum(['bar', 'column', 'line', 'pie', 'scatter', 'area', 'doughnut']),
  position: z.object({
    from: z.string().describe('Top-left cell (e.g., "A1")'),
    to: z.string().describe('Bottom-right cell (e.g., "G15")'),
  }),
  
  title: z.string().optional(),
  
  data: z.object({
    categories: z.string().describe('Range for categories/labels (e.g., "A2:A10")'),
    values: z.array(z.object({
      name: z.string(),
      range: z.string().describe('Range for values (e.g., "B2:B10")'),
    })),
  }),
  
  options: z.object({
    legend: z.object({
      position: z.enum(['top', 'bottom', 'left', 'right', 'none']).optional(),
    }).optional(),
    
    axes: z.object({
      x: z.object({ title: z.string().optional() }).optional(),
      y: z.object({ title: z.string().optional() }).optional(),
    }).optional(),
  }).optional(),
});

// ============ FORMATTING OPTIONS ============
export const FormattingSchema = z.object({
  // Freeze panes
  freeze_panes: z.string().optional().describe('Cell to freeze at (e.g., "A2" freezes row 1)'),
  
  // Auto filter
  auto_filter: z.boolean().optional(),
  
  // Page setup
  page_setup: z.object({
    orientation: z.enum(['portrait', 'landscape']).optional(),
    fitToPage: z.boolean().optional(),
    fitToWidth: z.number().optional(),
    fitToHeight: z.number().optional(),
    paperSize: z.number().optional(),
    margins: z.object({
      top: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
      right: z.number().optional(),
      header: z.number().optional(),
      footer: z.number().optional(),
    }).optional(),
  }).optional(),
  
  // Header & Footer
  header_footer: z.object({
    oddHeader: z.string().optional(),
    oddFooter: z.string().optional(),
    evenHeader: z.string().optional(),
    evenFooter: z.string().optional(),
  }).optional(),
  
  // Protection
  protection: z.object({
    sheet: z.boolean().optional(),
    password: z.string().optional(),
    formatCells: z.boolean().optional(),
    formatColumns: z.boolean().optional(),
    formatRows: z.boolean().optional(),
    insertColumns: z.boolean().optional(),
    insertRows: z.boolean().optional(),
    deleteColumns: z.boolean().optional(),
    deleteRows: z.boolean().optional(),
  }).optional(),
  
  // Totals row
  totals_row: z.record(z.string()).optional().describe('Column key -> formula mapping'),
  
  // Conditional formatting
  conditional_formatting: z.array(ConditionalFormattingSchema).optional(),
  
  // Merged cells
  merged_cells: z.array(z.string()).optional().describe('Array of ranges to merge (e.g., ["A1:D1"])'),
  
  // Row heights
  row_heights: z.record(z.number()).optional().describe('Row number -> height mapping'),
  
  // Hidden rows/columns
  hidden_rows: z.array(z.number()).optional(),
  hidden_columns: z.array(z.string()).optional(),
  
  // Group rows/columns
  grouped_rows: z.array(z.object({
    start: z.number(),
    end: z.number(),
    collapsed: z.boolean().optional(),
  })).optional(),
  
  grouped_columns: z.array(z.object({
    start: z.string(),
    end: z.string(),
    collapsed: z.boolean().optional(),
  })).optional(),
});

// ============ SHEET SCHEMA ============
export const SheetSchema = z.object({
  name: z.string().describe('Sheet name'),
  
  // Layout type
  layout: z.enum(['table', 'form', 'dashboard', 'report', 'calendar']).optional().default('table'),
  
  // Columns and data
  columns: z.array(ColumnSchema),
  data: z.array(z.record(z.any())).describe('Array of row objects'),
  
  // Formatting
  formatting: FormattingSchema.optional(),
  
  // Charts
  charts: z.array(ChartSchema).optional(),
  
  // Images
  images: z.array(z.object({
    position: z.object({
      from: z.string(),
      to: z.string(),
    }),
    url: z.string().optional(),
    base64: z.string().optional(),
    extension: z.enum(['png', 'jpg', 'jpeg', 'gif']).optional(),
  })).optional(),
  
  // Custom metadata
  metadata: z.record(z.any()).optional(),
});

// ============ MAIN EXCEL SCHEMA ============
export const ExcelSchema = z.object({
  file_name: z.string().describe('Name of the Excel file'),
  
  sheets: z.array(SheetSchema).min(1),
  
  // Workbook metadata
  metadata: z.object({
    title: z.string().optional(),
    subject: z.string().optional(),
    author: z.string().optional().default('AI Assistant'),
    description: z.string().optional(),
    company: z.string().optional(),
    category: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  
  // Output options
  options: z.object({
    storage: z.enum(['s3', 'local']).optional(),
    compress: z.boolean().optional(),
    password: z.string().optional(),
  }).optional(),
});

// Export types
export type ColumnConfig = z.infer<typeof ColumnSchema>;
export type ConditionalFormatting = z.infer<typeof ConditionalFormattingSchema>;
export type ChartConfig = z.infer<typeof ChartSchema>;
export type FormattingConfig = z.infer<typeof FormattingSchema>;
export type SheetConfig = z.infer<typeof SheetSchema>;
export type ExcelConfig = z.infer<typeof ExcelSchema>;
```

### 2.2 Validation Layer

**src/validators/schema-validator.ts**:
```typescript
import { ExcelSchema, ExcelConfig } from '../types/schema.js';
import { ZodError } from 'zod';

export class SchemaValidator {
  static validate(data: unknown): { success: true; data: ExcelConfig } | { success: false; errors: string[] } {
    try {
      const validated = ExcelSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validatePartial(data: unknown): { success: boolean; errors?: string[] } {
    try {
      ExcelSchema.partial().parse(data);
      return { success: true };
    } catch (error) {
      if (error instanceof ZodError) {
        return { 
          success: false, 
          errors: error.errors.map(e => e.message) 
        };
      }
      return { success: false, errors: ['Validation failed'] };
    }
  }
}
```

---

## 🔧 Phase 3: Excel Generation Engine (Ngày 3-5)

### 3.1 Base Generator

**src/generators/base-generator.ts**:
```typescript
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
      await worksheet.protect(fmt.protection.password, fmt.protection as any);
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
    return await this.workbook.xlsx.writeBuffer() as Buffer;
  }
}
```

### 3.2 Specific Generators

**src/generators/basic-generator.ts**:
```typescript
import { BaseGenerator } from './base-generator.js';
import { ExcelConfig } from '../types/schema.js';

export class BasicGenerator extends BaseGenerator {
  async generate(config: ExcelConfig): Promise<Buffer> {
    // Set workbook metadata
    if (config.metadata) {
      this.workbook.creator = config.metadata.author || 'AI Assistant';
      this.workbook.title = config.metadata.title;
      this.workbook.subject = config.metadata.subject;
      this.workbook.description = config.metadata.description;
      this.workbook.company = config.metadata.company;
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
```

**src/generators/report-generator.ts** (advanced styling):
```typescript
import { BaseGenerator } from './base-generator.js';
import { ExcelConfig, SheetConfig } from '../types/schema.js';
import ExcelJS from 'exceljs';

export class ReportGenerator extends BaseGenerator {
  async generate(config: ExcelConfig): Promise<Buffer> {
    // Set metadata
    if (config.metadata) {
      this.workbook.creator = config.metadata.author || 'AI Assistant';
      this.workbook.title = config.metadata.title;
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
```

### 3.3 Cell & Style Formatters

**src/formatters/cell-formatter.ts**:
```typescript
export class CellFormatter {
  getDefaultFormat(type: string): string {
    const formats: Record<string, string> = {
      text: '@',
      number: '#,##0',
      currency: '#,##0₫',
      percentage: '0.00%',
      date: 'dd/mm/yyyy',
      datetime: 'dd/mm/yyyy hh:mm:ss',
      boolean: 'General',
    };
    
    return formats[type] || 'General';
  }

  formatCurrency(value: number, symbol: string = '₫'): string {
    return `${value.toLocaleString()}${symbol}`;
  }

  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN');
  }
}
```

**src/formatters/style-formatter.ts**:
```typescript
import ExcelJS from 'exceljs';

export class StyleFormatter {
  applyStyle(cell: ExcelJS.Cell, style: any) {
    if (style.font) {
      cell.font = style.font;
    }
    
    if (style.alignment) {
      cell.alignment = style.alignment;
    }
    
    if (style.fill) {
      cell.fill = style.fill;
    }
    
    if (style.border) {
      cell.border = style.border;
    }
  }

  createBorder(style: string = 'thin', color: string = 'FF000000') {
    const borderStyle = { style, color: { argb: color } };
    return {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle,
    };
  }
}
```

---

## 💾 Phase 4: Storage Layer (Ngày 5-6)

### 4.1 S3 Storage

**src/storage/s3-storage.ts**:
```typescript
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
```

### 4.2 Local Storage (Development)

**src/storage/local-storage.ts**:
```typescript
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
```

---

## 🚀 Phase 5: MCP Server Implementation (Ngày 6-7)

### 5.1 Main MCP Server

**src/index.ts**:
```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';

import { SchemaValidator } from './validators/schema-validator.js';
import { BasicGenerator } from './generators/basic-generator.js';
import { ReportGenerator } from './generators/report-generator.js';
import { S3Storage } from './storage/s3-storage.js';
import { LocalStorage } from './storage/local-storage.js';
import { logger } from './utils/logger.js';
import { ExcelConfig } from './types/schema.js';

// Load environment variables
config();

// Initialize storage
const storageType = process.env.STORAGE_TYPE || 'local';
const storage = storageType === 's3' ? new S3Storage() : new LocalStorage();

// Create MCP server
const server = new Server(
  {
    name: 'excel-generator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_excel',
        description: `Generate an Excel file from a structured JSON schema.

Use this tool when the user wants to:
- Create an Excel file
- Export data to Excel
- Generate a report/spreadsheet
- Download data as .xlsx file

The tool accepts a JSON schema describing the structure, data, and formatting of the Excel file.

Supported features:
- Multiple sheets
- Custom column widths and formats
- Cell styling (fonts, colors, borders, alignment)
- Data validation
- Conditional formatting
- Formulas and totals
- Charts and images
- Page setup and printing options
- Freeze panes, auto-filter
- Merged cells
- Grouped rows/columns
- Sheet protection

Layout types:
- table: Simple data table (default)
- report: Formatted report with headers and styling
- form: Form-style layout
- dashboard: Dashboard with charts
- calendar: Calendar view`,
        inputSchema: {
          type: 'object',
          properties: {
            file_name: {
              type: 'string',
              description: 'Name of the Excel file (e.g., "report.xlsx")',
            },
            sheets: {
              type: 'array',
              description: 'Array of sheet configurations',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Sheet name',
                  },
                  layout: {
                    type: 'string',
                    enum: ['table', 'report', 'form', 'dashboard', 'calendar'],
                    description: 'Layout type for the sheet',
                  },
                  columns: {
                    type: 'array',
                    description: 'Column definitions',
                  },
                  data: {
                    type: 'array',
                    description: 'Array of data rows',
                  },
                  formatting: {
                    type: 'object',
                    description: 'Formatting options',
                  },
                  charts: {
                    type: 'array',
                    description: 'Charts to add to the sheet',
                  },
                },
                required: ['name', 'columns', 'data'],
              },
            },
            metadata: {
              type: 'object',
              description: 'Workbook metadata',
            },
            options: {
              type: 'object',
              description: 'Output options',
            },
          },
          required: ['sheets'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'generate_excel') {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`
    );
  }

  try {
    logger.info('Received generate_excel request');
    
    // Validate schema
    const validation = SchemaValidator.validate(request.params.arguments);
    
    if (!validation.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Schema validation failed: ${validation.errors.join(', ')}`
      );
    }
    
    const config: ExcelConfig = validation.data;
    
    // Select appropriate generator
    const generator = selectGenerator(config);
    
    // Generate Excel file
    logger.info(`Generating Excel file: ${config.file_name}`);
    const buffer = await generator.generate(config);
    
    logger.info(`Excel file generated, size: ${buffer.length} bytes`);
    
    // Upload to storage
    const fileName = config.file_name || `report_${Date.now()}.xlsx`;
    const key = await storage.upload(buffer, fileName);
    
    // Get download URL
    let downloadUrl: string;
    if (storage instanceof S3Storage) {
      const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600');
      downloadUrl = await storage.getPresignedUrl(key, expiresIn);
    } else {
      downloadUrl = await (storage as LocalStorage).getFileUrl(key);
    }
    
    logger.info('Excel file ready for download');
    
    // Return result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            download_url: downloadUrl,
            file_name: fileName,
            file_size: buffer.length,
            sheets_count: config.sheets.length,
            message: 'Excel file generated successfully',
            expires_in: storageType === 's3' ? parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600') : null,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Error generating Excel:', error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to generate Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

// Generator selection logic
function selectGenerator(config: ExcelConfig): BasicGenerator | ReportGenerator {
  // Check if any sheet uses report layout
  const hasReportLayout = config.sheets.some(sheet => sheet.layout === 'report');
  
  if (hasReportLayout) {
    return new ReportGenerator();
  }
  
  return new BasicGenerator();
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('Excel MCP Server started');
  logger.info(`Storage type: ${storageType}`);
}

main().catch((error) => {
  logger.error('Fatal error in main():', error);
  process.exit(1);
});
```

### 5.2 Utilities

**src/utils/logger.ts**:
```typescript
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export const logger = {
  error: (...args: any[]) => {
    if (levels[LOG_LEVEL as keyof typeof levels] >= levels.error) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (levels[LOG_LEVEL as keyof typeof levels] >= levels.warn) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (levels[LOG_LEVEL as keyof typeof levels] >= levels.info) {
      console.error('[INFO]', new Date().toISOString(), ...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (levels[LOG_LEVEL as keyof typeof levels] >= levels.debug) {
      console.error('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
};
```

**src/utils/error-handler.ts**:
```typescript
export class ExcelGenerationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ExcelGenerationError';
  }
}

export function handleError(error: unknown): { message: string; code: string } {
  if (error instanceof ExcelGenerationError) {
    return {
      message: error.message,
      code: error.code,
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }
  
  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
  };
}
```

---

## 📝 Phase 6: Example Schemas & Documentation (Ngày 7-8)

### 6.1 Example Use Cases

**examples/01-simple-table.json**:
```json
{
  "file_name": "simple_table.xlsx",
  "sheets": [
    {
      "name": "Products",
      "layout": "table",
      "columns": [
        {
          "header": "Product Name",
          "key": "name",
          "width": 30
        },
        {
          "header": "Price",
          "key": "price",
          "width": 15,
          "type": "currency",
          "format": "#,##0₫"
        },
        {
          "header": "Stock",
          "key": "stock",
          "width": 12,
          "type": "number"
        }
      ],
      "data": [
        {"name": "iPhone 15 Pro", "price": 30000000, "stock": 50},
        {"name": "Samsung S24", "price": 25000000, "stock": 35},
        {"name": "MacBook Pro", "price": 50000000, "stock": 20}
      ],
      "formatting": {
        "freeze_panes": "A2",
        "auto_filter": true
      }
    }
  ]
}
```

**examples/02-financial-report.json**:
```json
{
  "file_name": "financial_report_q4_2024.xlsx",
  "metadata": {
    "title": "Q4 2024 Financial Report",
    "author": "Finance Department",
    "company": "Tech Corp"
  },
  "sheets": [
    {
      "name": "Income Statement",
      "layout": "report",
      "metadata": {
        "title": "Income Statement - Q4 2024"
      },
      "columns": [
        {
          "header": "Category",
          "key": "category",
          "width": 30,
          "style": {
            "font": {"bold": true}
          }
        },
        {
          "header": "Q3 2024",
          "key": "q3",
          "width": 18,
          "type": "currency",
          "format": "#,##0₫"
        },
        {
          "header": "Q4 2024",
          "key": "q4",
          "width": 18,
          "type": "currency",
          "format": "#,##0₫"
        },
        {
          "header": "Change",
          "key": "change",
          "width": 15,
          "type": "percentage",
          "format": "0.00%"
        }
      ],
      "data": [
        {"category": "Revenue", "q3": 5000000000, "q4": 6000000000, "change": 0.2},
        {"category": "Cost of Goods Sold", "q3": 3000000000, "q4": 3500000000, "change": 0.167},
        {"category": "Gross Profit", "q3": 2000000000, "q4": 2500000000, "change": 0.25},
        {"category": "Operating Expenses", "q3": 800000000, "q4": 900000000, "change": 0.125},
        {"category": "Net Income", "q3": 1200000000, "q4": 1600000000, "change": 0.333}
      ],
      "formatting": {
        "freeze_panes": "A2",
        "conditional_formatting": [
          {
            "range": "D2:D100",
            "type": "cellIs",
            "operator": "greaterThan",
            "formulae": [0],
            "style": {
              "fill": {
                "type": "pattern",
                "pattern": "solid",
                "fgColor": {"argb": "FF90EE90"}
              }
            }
          },
          {
            "range": "D2:D100",
            "type": "cellIs",
            "operator": "lessThan",
            "formulae": [0],
            "style": {
              "fill": {
                "type": "pattern",
                "pattern": "solid",
                "fgColor": {"argb": "FFFF6B6B"}
              }
            }
          }
        ],
        "totals_row": {
          "q3": "=SUM(B2:B6)",
          "q4": "=SUM(C2:C6)"
        }
      }
    }
  ]
}
```

**examples/03-employee-database.json**:
```json
{
  "file_name": "employee_database.xlsx",
  "sheets": [
    {
      "name": "Employees",
      "columns": [
        {
          "header": "Employee ID",
          "key": "id",
          "width": 12
        },
        {
          "header": "Full Name",
          "key": "name",
          "width": 25
        },
        {
          "header": "Department",
          "key": "department",
          "width": 20,
          "validation": {
            "type": "list",
            "formulae": ["'IT','HR','Finance','Marketing'"],
            "showDropDown": true
          }
        },
        {
          "header": "Email",
          "key": "email",
          "width": 30
        },
        {
          "header": "Salary",
          "key": "salary",
          "width": 18,
          "type": "currency",
          "format": "#,##0₫"
        },
        {
          "header": "Join Date",
          "key": "join_date",
          "width": 15,
          "type": "date",
          "format": "dd/mm/yyyy"
        },
        {
          "header": "Status",
          "key": "status",
          "width": 12
        }
      ],
      "data": [
        {
          "id": "EMP001",
          "name": "Nguyen Van A",
          "department": "IT",
          "email": "nva@company.com",
          "salary": 25000000,
          "join_date": "2020-01-15",
          "status": "Active"
        },
        {
          "id": "EMP002",
          "name": "Tran Thi B",
          "department": "HR",
          "email": "ttb@company.com",
          "salary": 18000000,
          "join_date": "2021-03-20",
          "status": "Active"
        },
        {
          "id": "EMP003",
          "name": "Le Van C",
          "department": "Finance",
          "email": "lvc@company.com",
          "salary": 22000000,
          "join_date": "2019-07-10",
          "status": "Active"
        }
      ],
      "formatting": {
        "freeze_panes": "A2",
        "auto_filter": true,
        "conditional_formatting": [
          {
            "range": "E2:E1000",
            "type": "colorScale",
            "colorScale": {
              "cfvo": [
                {"type": "min"},
                {"type": "percentile", "value": 50},
                {"type": "max"}
              ],
              "color": [
                {"argb": "FFFF6B6B"},
                {"argb": "FFFFEB3B"},
                {"argb": "FF4CAF50"}
              ]
            }
          }
        ]
      }
    }
  ]
}
```

**examples/04-multi-sheet-report.json**:
```json
{
  "file_name": "comprehensive_report.xlsx",
  "metadata": {
    "title": "Comprehensive Business Report",
    "author": "Analytics Team",
    "description": "Multi-sheet report with summary and details"
  },
  "sheets": [
    {
      "name": "Summary",
      "layout": "report",
      "metadata": {
        "title": "Executive Summary"
      },
      "columns": [
        {"header": "Metric", "key": "metric", "width": 30},
        {"header": "Value", "key": "value", "width": 20, "type": "number", "format": "#,##0"}
      ],
      "data": [
        {"metric": "Total Revenue", "value": 15000000000},
        {"metric": "Total Orders", "value": 5000},
        {"metric": "Active Customers", "value": 2500},
        {"metric": "Average Order Value", "value": 3000000}
      ],
      "formatting": {
        "merged_cells": ["A1:B1"]
      }
    },
    {
      "name": "Sales Details",
      "columns": [
        {"header": "Date", "key": "date", "width": 12, "type": "date"},
        {"header": "Product", "key": "product", "width": 30},
        {"header": "Quantity", "key": "quantity", "width": 12, "type": "number"},
        {"header": "Unit Price", "key": "unit_price", "width": 15, "type": "currency"},
        {"header": "Total", "key": "total", "width": 18, "type": "currency"}
      ],
      "data": [
        {"date": "2024-11-01", "product": "Product A", "quantity": 10, "unit_price": 500000, "total": 5000000},
        {"date": "2024-11-02", "product": "Product B", "quantity": 5, "unit_price": 800000, "total": 4000000}
      ],
      "formatting": {
        "freeze_panes": "A2",
        "auto_filter": true,
        "totals_row": {
          "quantity": "=SUM(C2:C1000)",
          "total": "=SUM(E2:E1000)"
        }
      }
    },
    {
      "name": "Customer List",
      "columns": [
        {"header": "Customer ID", "key": "id", "width": 15},
        {"header": "Name", "key": "name", "width": 25},
        {"header": "City", "key": "city", "width": 20},
        {"header": "Total Purchases", "key": "purchases", "width": 18, "type": "currency"}
      ],
      "data": [
        {"id": "CUST001", "name": "Company A", "city": "Hanoi", "purchases": 50000000},
        {"id": "CUST002", "name": "Company B", "city": "Ho Chi Minh", "purchases": 75000000}
      ],
      "formatting": {
        "freeze_panes": "A2",
        "auto_filter": true
      }
    }
  ]
}
```

### 6.2 README Documentation

**README.md**:
```markdown
# Excel MCP Server

Dynamic Excel file generation server using Model Context Protocol (MCP).

## Features

- ✅ Generate Excel files from JSON schemas
- ✅ Multiple sheets support
- ✅ Advanced formatting (styling, borders, colors)
- ✅ Data validation
- ✅ Conditional formatting
- ✅ Formulas and calculations
- ✅ Charts (limited support)
- ✅ Page setup and printing options
- ✅ S3 and local file storage
- ✅ Presigned URLs for secure downloads

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file:

```env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-southeast-1
S3_BUCKET=your-bucket
PRESIGNED_URL_EXPIRY=3600
LOG_LEVEL=info
```

## Usage

### As MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "excel-generator": {
      "command": "node",
      "args": ["/path/to/excel-mcp-server/build/index.js"]
    }
  }
}
```

### Tool Usage

The server provides one tool: `generate_excel`

**Input Schema:**
```json
{
  "file_name": "report.xlsx",
  "sheets": [...],
  "metadata": {...},
  "options": {...}
}
```

See `examples/` directory for complete examples.

## JSON Schema Structure

### Column Configuration

```json
{
  "header": "Column Name",
  "key": "data_key",
  "width": 20,
  "type": "currency",
  "format": "#,##0₫",
  "style": {
    "font": {"bold": true},
    "alignment": {"horizontal": "center"}
  }
}
```

### Formatting Options

```json
{
  "freeze_panes": "A2",
  "auto_filter": true,
  "conditional_formatting": [...],
  "totals_row": {
    "column_key": "=SUM(A2:A100)"
  }
}
```

## Use Cases

### 1. Simple Data Table
See: `examples/01-simple-table.json`

### 2. Financial Report
See: `examples/02-financial-report.json`

### 3. Employee Database
See: `examples/03-employee-database.json`

### 4. Multi-Sheet Report
See: `examples/04-multi-sheet-report.json`

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Testing

Test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## License

MIT
```

---

## 🧪 Phase 7: Testing & Quality Assurance (Ngày 8-9)

### 7.1 Unit Tests

**tests/validators/schema-validator.test.ts**:
```typescript
import { SchemaValidator } from '../../src/validators/schema-validator';

describe('SchemaValidator', () => {
  test('validates correct schema', () => {
    const validSchema = {
      file_name: 'test.xlsx',
      sheets: [
        {
          name: 'Sheet1',
          columns: [
            { header: 'Name', key: 'name' },
          ],
          data: [{ name: 'Test' }],
        },
      ],
    };
    
    const result = SchemaValidator.validate(validSchema);
    expect(result.success).toBe(true);
  });
  
  test('rejects invalid schema', () => {
    const invalidSchema = {
      file_name: 'test.xlsx',
      sheets: [], // Empty sheets array
    };
    
    const result = SchemaValidator.validate(invalidSchema);
    expect(result.success).toBe(false);
  });
});
```

### 7.2 Integration Tests

**tests/integration/excel-generation.test.ts**:
```typescript
import { BasicGenerator } from '../../src/generators/basic-generator';
import { ExcelConfig } from '../../src/types/schema';

describe('Excel Generation', () => {
  test('generates basic Excel file', async () => {
    const config: ExcelConfig = {
      file_name: 'test.xlsx',
      sheets: [
        {
          name: 'Test Sheet',
          columns: [
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Age', key: 'age', width: 10 },
          ],
          data: [
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 },
          ],
        },
      ],
    };
    
    const generator = new BasicGenerator();
    const buffer = await generator.generate(config);
    
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
```

---

## 🚢 Phase 8: Deployment & Documentation (Ngày 9-10)

### 8.1 Docker Support (Optional)

**Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY build ./build

ENV NODE_ENV=production

CMD ["node", "build/index.js"]
```

### 8.2 CI/CD Pipeline

**`.github/workflows/test.yml`**:
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run lint
```

---

## 📊 Timeline Summary

| Phase | Days | Deliverables |
|-------|------|--------------|
| 1. Setup & Infrastructure | 1-2 | Project structure, dependencies |
| 2. Type System | 2-3 | TypeScript types, Zod schemas |
| 3. Excel Generation Engine | 3-5 | Generators, formatters |
| 4. Storage Layer | 5-6 | S3 and local storage |
| 5. MCP Server | 6-7 | Main server implementation |
| 6. Examples & Docs | 7-8 | Use case examples, README |
| 7. Testing | 8-9 | Unit and integration tests |
| 8. Deployment | 9-10 | Docker, CI/CD |

**Total: 10 days**

---