# 🚀 Deployment Guide - Dynamic Excel MCP Server

This guide covers deploying the Excel MCP Server in various environments, both locally and remotely.

## 📋 Table of Contents

- [Local Deployment (Stdio Mode)](#local-deployment-stdio-mode)
- [Remote Deployment (HTTP/SSE Mode)](#remote-deployment-httpsse-mode)
- [Docker Deployment](#docker-deployment)
- [VPS Deployment](#vps-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Security Considerations](#security-considerations)
- [Monitoring](#monitoring)

---

## 🖥️ Local Deployment (Stdio Mode)

### For Claude Desktop (Local MCP Client)

**1. Build the project:**
```bash
npm install
npm run build
```

**2. Configure Claude Desktop:**

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "excel-generator": {
      "command": "node",
      "args": ["/absolute/path/to/dynamic-excel-mcp-server/build/index.js"],
      "env": {
        "TRANSPORT_MODE": "stdio",
        "STORAGE_TYPE": "local",
        "DEV_STORAGE_PATH": "./temp-files",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
```json
{
  "mcpServers": {
    "excel-generator": {
      "command": "node",
      "args": ["C:\\path\\to\\dynamic-excel-mcp-server\\build\\index.js"],
      "env": {
        "TRANSPORT_MODE": "stdio",
        "STORAGE_TYPE": "local",
        "DEV_STORAGE_PATH": "./temp-files",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**3. Restart Claude Desktop**

---

## 🌐 Remote Deployment (HTTP/SSE Mode)

### Quick Start

**1. Create `.env` file:**
```env
TRANSPORT_MODE=http
HTTP_PORT=3000
HTTP_HOST=0.0.0.0
ALLOWED_ORIGINS=*
API_KEY=your-secret-api-key-here

STORAGE_TYPE=local
DEV_STORAGE_PATH=./temp-files
LOG_LEVEL=info
```

**2. Start server:**
```bash
npm run start:http
```

**3. Test the server:**
```bash
# Health check
curl http://localhost:3000/health

# Server info
curl http://localhost:3000/info
```

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `TRANSPORT_MODE` | Transport type: `stdio` or `http` | `stdio` | `http` |
| `HTTP_PORT` | HTTP server port | `3000` | `8080` |
| `HTTP_HOST` | Bind address | `0.0.0.0` | `127.0.0.1` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated or `*`) | `*` | `https://app.example.com` |
| `API_KEY` | Optional API key for authentication | - | `sk-abc123...` |
| `STORAGE_TYPE` | Storage backend: `local` or `s3` | `local` | `s3` |
| `LOG_LEVEL` | Logging level: `debug`, `info`, `warn`, `error` | `info` | `debug` |

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev files
RUN rm -rf src tsconfig.json

# Create storage directory
RUN mkdir -p /app/temp-files

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV TRANSPORT_MODE=http
ENV HTTP_PORT=3000
ENV HTTP_HOST=0.0.0.0

# Start server
CMD ["node", "build/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  excel-mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TRANSPORT_MODE=http
      - HTTP_PORT=3000
      - HTTP_HOST=0.0.0.0
      - ALLOWED_ORIGINS=*
      - API_KEY=${API_KEY}
      - STORAGE_TYPE=local
      - DEV_STORAGE_PATH=/app/temp-files
      - LOG_LEVEL=info
    volumes:
      - ./temp-files:/app/temp-files
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Build and run:

```bash
# Build image
docker build -t excel-mcp-server .

# Run container
docker run -d \
  -p 3000:3000 \
  -e TRANSPORT_MODE=http \
  -e API_KEY=your-secret-key \
  --name excel-server \
  excel-mcp-server

# Or use docker-compose
docker-compose up -d
```

---

## 🖧 VPS Deployment

### Using PM2 (Process Manager)

**1. Install PM2:**
```bash
npm install -g pm2
```

**2. Create `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [{
    name: 'excel-mcp-server',
    script: './build/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      TRANSPORT_MODE: 'http',
      HTTP_PORT: 3000,
      HTTP_HOST: '0.0.0.0',
      ALLOWED_ORIGINS: '*',
      API_KEY: process.env.API_KEY,
      STORAGE_TYPE: 'local',
      LOG_LEVEL: 'info'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

**3. Start with PM2:**
```bash
# Build
npm run build

# Start
pm2 start ecosystem.config.js

# View logs
pm2 logs excel-mcp-server

# Monitor
pm2 monit

# Restart
pm2 restart excel-mcp-server

# Auto-start on reboot
pm2 startup
pm2 save
```

### Nginx Reverse Proxy

**Create `/etc/nginx/sites-available/excel-mcp`:**
```nginx
upstream excel_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name excel-api.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name excel-api.example.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/excel-api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/excel-api.example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/excel-mcp-access.log;
    error_log /var/log/nginx/excel-mcp-error.log;

    # Proxy settings
    location / {
        proxy_pass http://excel_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

**Enable and restart:**
```bash
sudo ln -s /etc/nginx/sites-available/excel-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d excel-api.example.com
```

---

## ☁️ Cloud Deployment

### AWS EC2

**1. Launch EC2 instance (Ubuntu 22.04 LTS)**

**2. Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**3. Clone and setup:**
```bash
git clone <your-repo>
cd dynamic-excel-mcp-server
npm install
npm run build
```

**4. Setup systemd service:**

Create `/etc/systemd/system/excel-mcp.service`:
```ini
[Unit]
Description=Excel MCP Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/dynamic-excel-mcp-server
Environment=NODE_ENV=production
Environment=TRANSPORT_MODE=http
Environment=HTTP_PORT=3000
ExecStart=/usr/bin/node /home/ubuntu/dynamic-excel-mcp-server/build/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable excel-mcp
sudo systemctl start excel-mcp
sudo systemctl status excel-mcp
```

### Google Cloud Platform (Cloud Run)

**1. Create `Dockerfile` (see above)**

**2. Build and deploy:**
```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/excel-mcp-server

# Deploy
gcloud run deploy excel-mcp-server \
  --image gcr.io/YOUR_PROJECT_ID/excel-mcp-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="TRANSPORT_MODE=http,HTTP_PORT=8080" \
  --port 8080
```

### Heroku

**1. Create `Procfile`:**
```
web: node build/index.js
```

**2. Deploy:**
```bash
heroku create excel-mcp-server
heroku config:set TRANSPORT_MODE=http HTTP_PORT=$PORT
git push heroku main
```

---

## 🔒 Security Considerations

### 1. API Key Authentication

Enable API key in `.env`:
```env
API_KEY=sk-your-very-secret-key-12345
```

**Usage:**
```bash
# Header
curl -H "X-API-Key: sk-your-very-secret-key-12345" http://localhost:3000/sse

# Query parameter
curl "http://localhost:3000/sse?apiKey=sk-your-very-secret-key-12345"
```

### 2. CORS Configuration

**Restrict origins:**
```env
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

### 3. Rate Limiting

Add rate limiting middleware (install `express-rate-limit`):

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 4. Use HTTPS

Always use HTTPS in production with valid SSL certificates.

### 5. Firewall Rules

Only expose necessary ports:
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 📊 Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-11-07T10:30:00.000Z"
}
```

### Server Info

```bash
curl http://localhost:3000/info
```

Response:
```json
{
  "name": "Excel MCP Server",
  "version": "1.0.0",
  "transport": "SSE",
  "endpoints": {
    "sse": "/sse",
    "health": "/health",
    "info": "/info"
  }
}
```

### Logging

View logs:
```bash
# PM2
pm2 logs excel-mcp-server

# Systemd
sudo journalctl -u excel-mcp -f

# Docker
docker logs -f excel-server
```

### Monitoring Tools

- **Uptime monitoring:** UptimeRobot, Pingdom
- **Performance:** New Relic, Datadog
- **Error tracking:** Sentry
- **Infrastructure:** Prometheus + Grafana

---

## 🔧 Troubleshooting

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Permission issues
```bash
sudo chown -R $USER:$USER /path/to/dynamic-excel-mcp-server
```

### Connection refused
Check firewall and ensure server is listening on correct host/port.

### CORS errors
Update `ALLOWED_ORIGINS` in `.env` to include your client domain.

---

## 📚 Additional Resources

- [MCP Documentation](https://github.com/anthropics/mcp)
- [Express.js Guide](https://expressjs.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
