#!/usr/bin/env node

/**
 * HANA MCP Server - HTTP transport. POST /mcp for JSON-RPC; GET for server info.
 * Set MCP_HTTP_PORT, MCP_HTTP_HOST (default 127.0.0.1:3100).
 */

const http = require('http');
const { logger } = require('../utils/logger');
const MCPHandler = require('./mcp-handler');
const { ERROR_CODES } = require('../constants/mcp-constants');
const { validateBearer } = require('./http-auth');

const PORT = parseInt(process.env.MCP_HTTP_PORT, 10) || 3100;
const HOST = process.env.MCP_HTTP_HOST || '127.0.0.1';
const MCP_PATH = '/mcp';

function sendResponse(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function sendJsonRpcError(res, id, code, message) {
  sendResponse(res, 200, {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message }
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    const allowed = process.env.MCP_HTTP_ALLOWED_ORIGINS || 'null';
    const allowedList = allowed.split(',').map(s => s.trim());
    if (!allowedList.includes('*') && !allowedList.includes(origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Origin' } }));
      return;
    }
  }

  const path = (req.url || '').split('?')[0];
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'hana-mcp-server' }));
    return;
  }

  if (path !== MCP_PATH && !req.url.startsWith(`${MCP_PATH}?`)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', path: MCP_PATH }));
    return;
  }

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      server: 'hana-mcp-server',
      transport: 'Streamable HTTP',
      message: 'Send JSON-RPC requests via POST to this URL',
      mcpPath: MCP_PATH
    }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'GET, POST' });
    res.end();
    return;
  }

  if (process.env.MCP_HTTP_AUTH_ENABLED === 'true') {
    try {
      await validateBearer(req);
    } catch (err) {
      const status = err.statusCode || 401;
      const headers = { 'Content-Type': 'application/json' };
      if (err.wwwAuth) headers['WWW-Authenticate'] = err.wwwAuth;
      res.writeHead(status, headers);
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: err.message } }));
      return;
    }
  }

  const protocolVersion = req.headers['mcp-protocol-version'] || '2025-11-25';

  let body = '';
  for await (const chunk of req) {
    body += chunk.toString();
  }

  let request;
  try {
    request = JSON.parse(body || '{}');
  } catch (_) {
    sendJsonRpcError(res, null, ERROR_CODES.PARSE_ERROR, 'Parse error');
    return;
  }

  const validation = MCPHandler.validateRequest(request);
  if (!validation.valid) {
    sendJsonRpcError(res, request.id, ERROR_CODES.INVALID_REQUEST, validation.error);
    return;
  }

  try {
    const response = await MCPHandler.handleRequest(request);
    if (response) {
      sendResponse(res, 200, response);
    } else {
      res.writeHead(202);
      res.end();
    }
  } catch (err) {
    logger.error(`HTTP MCP error: ${err.message}`);
    sendJsonRpcError(res, request.id, ERROR_CODES.INTERNAL_ERROR, err.message);
  }
});

server.listen(PORT, HOST, () => {
  logger.info(`MCP HTTP server listening on http://${HOST}:${PORT}${MCP_PATH}`);
});

server.on('error', (err) => {
  logger.error(`HTTP server error: ${err.message}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});
