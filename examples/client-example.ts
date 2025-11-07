/**
 * Example client for connecting to Excel MCP Server via HTTP/SSE
 *
 * This demonstrates how to connect to a remotely deployed Excel MCP Server
 * and generate Excel files programmatically.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Server configuration
const SERVER_URL = 'http://localhost:3000';
const API_KEY = 'your-api-key'; // Optional, if server has API_KEY set

// Example: Generate a simple product table
const exampleSchema = {
  file_name: 'products_report.xlsx',
  sheets: [
    {
      name: 'Products',
      layout: 'table',
      columns: [
        {
          header: 'Product Name',
          key: 'name',
          width: 30
        },
        {
          header: 'Price',
          key: 'price',
          width: 15,
          type: 'currency',
          format: '$#,##0.00'
        },
        {
          header: 'Stock',
          key: 'stock',
          width: 12,
          type: 'number'
        },
        {
          header: 'Status',
          key: 'status',
          width: 15
        }
      ],
      data: [
        {
          name: 'iPhone 15 Pro',
          price: 999.99,
          stock: 50,
          status: 'In Stock'
        },
        {
          name: 'MacBook Pro',
          price: 2499.99,
          stock: 20,
          status: 'In Stock'
        },
        {
          name: 'AirPods Pro',
          price: 249.99,
          stock: 0,
          status: 'Out of Stock'
        }
      ],
      formatting: {
        freeze_panes: 'A2',
        auto_filter: true,
        conditional_formatting: [
          {
            range: 'D2:D100',
            type: 'cellIs',
            operator: 'equal',
            formulae: ['Out of Stock'],
            style: {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF6B6B' }
              }
            }
          }
        ]
      }
    }
  ],
  metadata: {
    title: 'Product Inventory Report',
    author: 'Sales Team',
    company: 'Example Corp'
  }
};

async function generateExcel() {
  try {
    console.log('Connecting to Excel MCP Server...');

    // Create SSE transport
    const transport = new SSEClientTransport(
      new URL(`${SERVER_URL}/sse`),
      {
        headers: API_KEY ? { 'X-API-Key': API_KEY } : undefined
      }
    );

    // Create MCP client
    const client = new Client(
      {
        name: 'excel-client',
        version: '1.0.0',
      },
      {
        capabilities: {}
      }
    );

    // Connect
    await client.connect(transport);
    console.log('Connected to server!');

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name));

    // Call generate_excel tool
    console.log('\nGenerating Excel file...');
    const result = await client.callTool({
      name: 'generate_excel',
      arguments: exampleSchema
    });

    // Parse result
    const response = JSON.parse(result.content[0].text);
    console.log('\n✅ Excel file generated successfully!');
    console.log('Download URL:', response.download_url);
    console.log('File name:', response.file_name);
    console.log('File size:', response.file_size, 'bytes');
    console.log('Sheets count:', response.sheets_count);

    // Close connection
    await client.close();
    console.log('\nConnection closed.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
generateExcel();
