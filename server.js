import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const distRoot = path.resolve(process.env.DIST_DIR || path.join(root, 'dist'))
const port = Number(process.env.HTTP_PORT || 3000)
const upstreamValue = process.env.DOCUMENTS_API_URL?.trim()
const requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 30 * 60 * 1000)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendJson(response, status, body) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  response.end(payload)
}

function joinedUpstreamPath(upstream, requestUrl) {
  const suffix = requestUrl.slice('/api'.length) || '/'
  const basePath = upstream.pathname.replace(/\/$/, '')
  return `${basePath}${suffix.startsWith('/') ? suffix : `/${suffix}`}`
}

function proxyRequest(request, response) {
  if (!upstreamValue) {
    sendJson(response, 503, { error: 'Documents API is not configured' })
    return
  }

  let upstream
  try {
    upstream = new URL(upstreamValue)
  } catch {
    sendJson(response, 500, { error: 'Documents API URL is invalid' })
    return
  }

  const transport = upstream.protocol === 'https:' ? https : http
  const headers = {
    ...request.headers,
    host: upstream.host,
    'x-forwarded-host': request.headers.host || '',
    'x-forwarded-proto': request.headers['x-forwarded-proto'] || 'http',
  }
  delete headers.connection

  const proxy = transport.request({
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: upstream.port || undefined,
    method: request.method,
    path: joinedUpstreamPath(upstream, request.url || '/api'),
    headers,
    timeout: requestTimeout,
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers)
    upstreamResponse.pipe(response)
  })

  proxy.on('timeout', () => proxy.destroy(new Error('upstream timeout')))
  proxy.on('error', (error) => {
    console.error('Documents API proxy error:', error.message)
    if (!response.headersSent) sendJson(response, 502, { error: 'Documents API is unavailable' })
    else response.destroy()
  })

  request.pipe(proxy)
}

function safeFilePath(urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }

  const candidate = path.resolve(distRoot, decoded.replace(/^\/+/, ''))
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${path.sep}`)) return null
  return candidate
}

function serveFile(request, response, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      if (path.extname(filePath)) {
        response.writeHead(404)
        response.end('Not found')
        return
      }
      serveFile(request, response, path.join(distRoot, 'index.html'))
      return
    }

    const headers = {
      'content-type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'content-length': stats.size,
    }
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      headers['cache-control'] = 'public, max-age=31536000, immutable'
    } else {
      headers['cache-control'] = 'no-cache'
    }

    response.writeHead(200, headers)
    if (request.method === 'HEAD') response.end()
    else fs.createReadStream(filePath).pipe(response)
  })
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://localhost')

  if (requestUrl.pathname === '/__health') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/')) {
    proxyRequest(request, response)
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' })
    response.end('Method not allowed')
    return
  }

  const filePath = safeFilePath(requestUrl.pathname)
  if (!filePath) {
    response.writeHead(400)
    response.end('Bad request')
    return
  }
  serveFile(request, response, filePath)
})

server.requestTimeout = requestTimeout
server.listen(port, '0.0.0.0', () => {
  console.log(`Portal Documents frontend listening on :${port}`)
  console.log(`Documents API upstream: ${upstreamValue || 'not configured'}`)
})
