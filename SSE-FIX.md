# SSE Endpoint Fix - Connection Hanging Issue

## 🐛 Problem

The `/sse` endpoint was hanging and not establishing connections properly. Clients connecting to the SSE endpoint would hang indefinitely without receiving any data.

### Error Messages
```
Error [ERR_HTTP_HEADERS_SENT]: Cannot write headers after they are sent to the client
```

## 🔍 Root Cause

The issue had two main causes:

1. **Double Header Setting**: We were calling `res.writeHead()` manually before creating the SSE transport, but `SSEServerTransport` from the MCP SDK also sets headers when it starts. This caused the "ERR_HTTP_HEADERS_SENT" error.

2. **Incorrect Architecture**: We were passing a single MCP server instance to all connections. SSE transport requires each connection to have its own server instance.

## ✅ Solution

### 1. Factory Pattern for MCP Server

Changed from passing a single server instance to using a factory function:

```typescript
// ❌ Before: Single server instance
const server = createMcpServer();
httpServer.setupMcpEndpoint(server);

// ✅ After: Factory function
httpServer.setupMcpEndpoint({
  createServer: createMcpServer  // Each connection gets new instance
});
```

### 2. Let Transport Handle Headers

Removed manual header setting and let SSEServerTransport handle it:

```typescript
// ❌ Before: Manual header setting
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
});
const transport = new SSEServerTransport('/message', res);

// ✅ After: Transport sets headers
const transport = new SSEServerTransport('/message', res);
// Headers are set internally by the transport
```

### 3. Proper Connection Lifecycle

Added:
- Keep-alive pings every 30 seconds
- Clean disconnect handling
- Proper transport closure

```typescript
// Keep connection alive
const keepAlive = setInterval(() => {
  if (res.writableEnded) {
    clearInterval(keepAlive);
    return;
  }
  res.write(': keep-alive\n\n');
}, 30000);

// Handle disconnect
req.on('close', () => {
  clearInterval(keepAlive);
  transport.close();
});
```

## 🧪 Testing

### Quick Test

```bash
# Start server
TRANSPORT_MODE=http npm start

# In another terminal
curl http://localhost:3000/health
curl http://localhost:3000/info
curl -N http://localhost:3000/sse  # Should connect without hanging
```

### Test Script

```bash
./test-sse.sh
```

### Expected Logs

```
[INFO] New SSE client connecting...
[INFO] SSE connection established and MCP server connected
[INFO] SSE client disconnected
```

## 📊 Results

| Before | After |
|--------|-------|
| ❌ Connection hangs | ✅ Connects immediately |
| ❌ ERR_HTTP_HEADERS_SENT | ✅ No errors |
| ❌ Single server instance | ✅ Factory pattern |
| ❌ Manual headers | ✅ Transport handles headers |

## 🚀 Usage

### Local Testing

```bash
# Create .env
TRANSPORT_MODE=http
HTTP_PORT=3000
STORAGE_TYPE=local

# Start server
npm start
```

### With MCP Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const transport = new SSEClientTransport(
  new URL('http://localhost:3000/sse')
);

const client = new Client({
  name: 'excel-client',
  version: '1.0.0',
}, { capabilities: {} });

await client.connect(transport);
// Now you can call tools!
```

## 📝 Key Takeaways

1. **MCP SSE Pattern**: Each SSE connection needs its own MCP server instance
2. **Transport Control**: Let MCP transport classes handle their own headers/protocol
3. **Factory Pattern**: Use factory functions for per-connection instances
4. **Keep-Alive**: Send periodic pings to maintain SSE connections

## 🔗 Related Files

- `src/transports/http-server.ts` - HTTP/SSE transport implementation
- `src/index.ts` - Server factory and initialization
- `test-sse.sh` - Simple connectivity test
- `examples/client-example.ts` - Full client example

## 📚 References

- [MCP SDK Documentation](https://github.com/anthropics/mcp)
- [SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Express.js SSE Guide](https://expressjs.com/)
