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
