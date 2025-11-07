import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { logger } from '../utils/logger.js';

export interface HttpServerConfig {
  port: number;
  host: string;
  allowedOrigins: string[];
  apiKey?: string;
}

export class HttpTransportServer {
  private app: express.Application;
  private config: HttpServerConfig;

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

    // API key authentication middleware
    if (this.config.apiKey) {
      this.app.use((req, res, next) => {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        if (apiKey !== this.config.apiKey) {
          return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
        }
        next();
      });
    }

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Info endpoint
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
  }

  setupMcpEndpoint(mcpServer: Server) {
    // SSE endpoint for MCP communication
    this.app.get('/sse', async (req, res) => {
      logger.info('SSE client connected');

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Create SSE transport
      const transport = new SSEServerTransport('/message', res);

      // Connect MCP server to this transport
      await mcpServer.connect(transport);

      // Handle client disconnect
      req.on('close', () => {
        logger.info('SSE client disconnected');
        transport.close();
      });
    });

    // Message endpoint for client requests
    this.app.post('/message', async (req, res) => {
      try {
        // This will be handled by the SSE transport
        res.json({ success: true });
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
        logger.info(`Health check: http://${this.config.host}:${this.config.port}/health`);
        resolve();
      });
    });
  }
}
