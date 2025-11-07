/**
 * Example JavaScript client for Excel MCP Server (HTTP/SSE)
 *
 * Usage: node examples/client-example.js
 *
 * This is a simple JavaScript example using fetch and EventSource
 */

const SERVER_URL = 'http://localhost:3000';
const API_KEY = ''; // Optional

// Example schema
const exampleSchema = {
  file_name: 'sample_report.xlsx',
  sheets: [
    {
      name: 'Sales Data',
      layout: 'table',
      columns: [
        { header: 'Date', key: 'date', width: 12, type: 'date' },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'Quantity', key: 'quantity', width: 12, type: 'number' },
        { header: 'Revenue', key: 'revenue', width: 15, type: 'currency', format: '$#,##0.00' }
      ],
      data: [
        { date: '2024-01-01', product: 'Widget A', quantity: 10, revenue: 1000 },
        { date: '2024-01-02', product: 'Widget B', quantity: 5, revenue: 750 },
        { date: '2024-01-03', product: 'Widget C', quantity: 15, revenue: 2250 }
      ],
      formatting: {
        freeze_panes: 'A2',
        auto_filter: true,
        totals_row: {
          quantity: '=SUM(C2:C100)',
          revenue: '=SUM(D2:D100)'
        }
      }
    }
  ]
};

async function generateExcel() {
  try {
    console.log('🔌 Connecting to Excel MCP Server...');

    // Health check
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error('Server health check failed');
    }
    console.log('✅ Server is healthy');

    // Get server info
    const infoResponse = await fetch(`${SERVER_URL}/info`);
    const info = await infoResponse.json();
    console.log('📊 Server info:', info);

    // For SSE connection with MCP SDK, use the SDK client
    // For simple REST API approach, you would need to implement
    // the MCP protocol manually or use the official client library

    console.log('\n⚠️  Note: This example shows server health check.');
    console.log('For full MCP client implementation, use the TypeScript example with @modelcontextprotocol/sdk');
    console.log('Or implement a custom MCP client following the protocol specification.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Simple REST API wrapper example (if you add REST endpoints)
async function generateExcelREST() {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    const response = await fetch(`${SERVER_URL}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(exampleSchema)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    console.log('✅ Excel file generated!');
    console.log('Download URL:', result.download_url);
    console.log('File name:', result.file_name);

    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run example
generateExcel();
