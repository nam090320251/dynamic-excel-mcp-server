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
