# Dynamic Excel MCP Server

Dynamic Excel file generation server using Model Context Protocol (MCP). This server allows LLMs to automatically create Excel files with any structure through dynamic JSON schemas.

## 🚀 Features

- ✅ Generate Excel files from JSON schemas
- ✅ Multiple sheets support
- ✅ Advanced formatting (styling, borders, colors)
- ✅ Data validation and conditional formatting
- ✅ Formulas and calculations
- ✅ Charts support (limited)
- ✅ Page setup and printing options
- ✅ S3 and local file storage
- ✅ Presigned URLs for secure downloads
- ✅ Freeze panes, auto-filter
- ✅ Merged cells and row grouping

## 📦 Installation

```bash
npm install
npm run build
```

## ⚙️ Configuration

Create a `.env` file (copy from `.env.example`):

```env
STORAGE_TYPE=local  # or 's3' for AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-southeast-1
S3_BUCKET=your-bucket
PRESIGNED_URL_EXPIRY=3600
LOG_LEVEL=info
DEV_STORAGE_PATH=./temp-files
```

## 🔧 Usage

### As MCP Server

Add to your Claude Desktop or MCP client configuration:

**For macOS** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "excel-generator": {
      "command": "node",
      "args": ["/absolute/path/to/excel-mcp-server/build/index.js"],
      "env": {
        "STORAGE_TYPE": "local",
        "DEV_STORAGE_PATH": "./temp-files",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**For Windows** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "excel-generator": {
      "command": "node",
      "args": ["C:\\path\\to\\excel-mcp-server\\build\\index.js"],
      "env": {
        "STORAGE_TYPE": "local",
        "DEV_STORAGE_PATH": "./temp-files",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Tool: generate_excel

The server provides one tool: `generate_excel`

**Input Schema:**
```json
{
  "file_name": "report.xlsx",
  "sheets": [
    {
      "name": "Sheet1",
      "columns": [...],
      "data": [...],
      "formatting": {...}
    }
  ],
  "metadata": {...},
  "options": {...}
}
```

## 📚 JSON Schema Structure

### Column Configuration

```json
{
  "header": "Column Name",
  "key": "data_key",
  "width": 20,
  "type": "currency",
  "format": "#,##0₫",
  "style": {
    "font": {"bold": true, "size": 12},
    "alignment": {"horizontal": "center"},
    "fill": {
      "type": "pattern",
      "pattern": "solid",
      "fgColor": {"argb": "FFFF0000"}
    }
  }
}
```

### Supported Column Types
- `text`: Plain text
- `number`: Numeric values
- `currency`: Currency format
- `percentage`: Percentage format
- `date`: Date format
- `datetime`: Date and time format
- `boolean`: Boolean values
- `formula`: Excel formulas

### Formatting Options

```json
{
  "freeze_panes": "A2",
  "auto_filter": true,
  "conditional_formatting": [
    {
      "range": "A2:A100",
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
    }
  ],
  "totals_row": {
    "column_key": "=SUM(A2:A100)"
  },
  "merged_cells": ["A1:D1"],
  "row_heights": {
    "1": 30,
    "2": 25
  }
}
```

## 📖 Examples

### 1. Simple Data Table
See: `examples/01-simple-table.json`

Creates a basic product table with formatting:
- Freeze panes
- Auto-filter
- Currency formatting

### 2. Financial Report
See: `examples/02-financial-report.json`

Advanced report with:
- Report layout with title
- Conditional formatting
- Percentage calculations
- Formula totals

### 3. Employee Database
See: `examples/03-employee-database.json`

Employee management spreadsheet with:
- Multiple column types
- Date formatting
- Currency display
- Auto-filter

### 4. Multi-Sheet Report
See: `examples/04-multi-sheet-report.json`

Comprehensive report with:
- Multiple sheets
- Summary and detail views
- Cross-sheet consistency

## 🔨 Development

```bash
# Run in development mode (with auto-reload)
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## 🧪 Testing with MCP Inspector

Test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## 🎯 Use Cases

1. **Data Export**: Export database queries to formatted Excel files
2. **Financial Reports**: Generate quarterly/annual financial statements
3. **Inventory Management**: Create product catalogs and stock reports
4. **HR Management**: Employee databases and payroll reports
5. **Sales Analytics**: Sales reports with charts and conditional formatting
6. **Project Tracking**: Project status reports with multiple sheets

## 🏗️ Architecture

```
src/
├── index.ts                 # MCP Server entry point
├── types/
│   └── schema.ts           # TypeScript types & Zod schemas
├── generators/
│   ├── base-generator.ts   # Abstract base class
│   ├── basic-generator.ts  # Simple tables
│   └── report-generator.ts # Reports with styling
├── formatters/
│   ├── cell-formatter.ts   # Cell formatting
│   ├── style-formatter.ts  # Styling utilities
│   └── formula-builder.ts  # Formula generation
├── storage/
│   ├── s3-storage.ts       # S3 upload handler
│   └── local-storage.ts    # Local file system
├── validators/
│   └── schema-validator.ts # JSON schema validation
└── utils/
    ├── logger.ts           # Logging utility
    └── error-handler.ts    # Error handling
```

## 🔐 Security Notes

- For S3 storage, ensure proper IAM permissions
- Use presigned URLs for temporary file access
- Set appropriate expiry times for download links
- Validate all user inputs through Zod schemas

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

## 🎉 Acknowledgments

Built with:
- [Model Context Protocol (MCP)](https://github.com/anthropics/mcp)
- [ExcelJS](https://github.com/exceljs/exceljs)
- [Zod](https://github.com/colinhacks/zod)
- [AWS SDK](https://aws.amazon.com/sdk-for-javascript/)
