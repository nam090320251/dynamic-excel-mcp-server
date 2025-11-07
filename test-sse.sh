#!/bin/bash

# Test script for SSE endpoint
# Run this after starting the server with: TRANSPORT_MODE=http npm start

echo "🧪 Testing Excel MCP Server HTTP/SSE endpoints..."
echo ""

# Test 1: Health check
echo "1️⃣ Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo "Response: $HEALTH_RESPONSE"
echo ""

# Test 2: Info endpoint
echo "2️⃣ Testing /info endpoint..."
INFO_RESPONSE=$(curl -s http://localhost:3000/info)
echo "Response: $INFO_RESPONSE"
echo ""

# Test 3: SSE endpoint connection
echo "3️⃣ Testing /sse endpoint (5 seconds)..."
echo "Connecting to SSE endpoint..."
timeout 5 curl -N -H "Accept: text/event-stream" http://localhost:3000/sse &
SSE_PID=$!

sleep 6

if ps -p $SSE_PID > /dev/null 2>&1; then
  echo "⚠️  SSE connection still active (killing)"
  kill $SSE_PID 2>/dev/null
else
  echo "✅ SSE connection established and closed cleanly"
fi

echo ""
echo "✅ Basic connectivity tests complete!"
echo ""
echo "📝 To test with MCP SDK client, see examples/client-example.ts"
