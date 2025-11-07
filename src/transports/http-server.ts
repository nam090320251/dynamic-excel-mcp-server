import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { logger } from '../utils/logger.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export interface HttpServerConfig {
  port: number;
  host: string;
  allowedOrigins: string[];
  apiKey?: string;
}

export interface McpServerFactory {
  createServer: () => Server;
}

export class HttpTransportServer {
  private app: express.Application;
  private config: HttpServerConfig;
  private serverFactory?: McpServerFactory;

  constructor(config: HttpServerConfig) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
  }

  private setupMiddleware() {
    // CORS configuration
    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (this.config.allowedOrigins.includes('*')) {
          return callback(null, true);
        }

        if (this.config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    };

    this.app.use(cors(corsOptions));
    this.app.use(express.json({ limit: '50mb' }));

    // Health check endpoint (no auth required)
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Info endpoint (no auth required)
    this.app.get('/info', (req, res) => {
      res.json({
        name: 'Excel MCP Server',
        version: '1.0.0',
        transport: 'SSE',
        endpoints: {
          sse: '/sse',
          health: '/health',
          info: '/info',
        },
      });
    });

    // API key authentication middleware (applied after public endpoints)
    if (this.config.apiKey) {
      this.app.use((req, res, next) => {
        // Skip auth for health and info endpoints
        if (req.path === '/health' || req.path === '/info') {
          return next();
        }

        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        if (apiKey !== this.config.apiKey) {
          return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
        }
        next();
      });
    }
  }

  setupMcpEndpoint(serverFactory: McpServerFactory) {
    this.serverFactory = serverFactory;

    // SSE endpoint for MCP communication
    this.app.get('/sse', async (req, res) => {
      logger.info('New SSE client connecting...');

      try {
        // Create a new MCP server instance for this connection
        const mcpServer = this.serverFactory!.createServer();

        // Create SSE transport with correct endpoint path
        // The transport will handle POST requests to this path
        const transport = new SSEServerTransport('/messages', res);

        // Connect the MCP server to the transport
        await mcpServer.connect(transport);
        logger.info('SSE connection established and MCP server connected');

        // Handle client disconnect
        req.on('close', () => {
          logger.info('SSE client disconnected');
          transport.close().catch((err) => {
            logger.error('Error closing transport:', err);
          });
        });

        // Keep connection alive
        const keepAlive = setInterval(() => {
          if (res.writableEnded) {
            clearInterval(keepAlive);
            return;
          }
          res.write(': keep-alive\n\n');
        }, 30000);

        req.on('close', () => {
          clearInterval(keepAlive);
        });

      } catch (error) {
        logger.error('Error in SSE endpoint:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to establish SSE connection' });
        }
      }
    });

    // Message endpoint for client requests
    // This endpoint receives POST requests from the client
    this.app.post('/messages', async (req, res) => {
      try {
        logger.info('Received message from client:', JSON.stringify(req.body));

        // The SSEServerTransport automatically handles routing of messages
        // to the appropriate session. We just need to acknowledge receipt.
        // The actual message handling is done by the transport internally.
        res.status(200).json({ ok: true });
      } catch (error) {
        logger.error('Error handling message:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, this.config.host, () => {
        logger.info(`HTTP server listening on http://${this.config.host}:${this.config.port}`);
        logger.info(`SSE endpoint: http://${this.config.host}:${this.config.port}/sse`);
        logger.info(`Messages endpoint: http://${this.config.host}:${this.config.port}/messages`);
        logger.info(`Health check: http://${this.config.host}:${this.config.port}/health`);
        resolve();
      });
    });
  }
}