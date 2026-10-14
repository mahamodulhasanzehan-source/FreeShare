import type { IncomingMessage, ServerResponse } from 'http';
import {
  handleListMedia,
  handleResolveMedia,
  handlePresignPut,
  handleMultipartStart,
  handleMultipartSignPart,
  handleMultipartComplete,
  handleMultipartAbort,
  handleStats,
} from './apiHandlers.ts';

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.end(JSON.stringify(data));
}

export async function apiRouter(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const urlObj = new URL(req.url || '/', 'http://localhost');
  const pathname = urlObj.pathname;

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.end();
    return true;
  }

  try {
    if (pathname === '/api/media' && req.method === 'GET') {
      const limit = Number(urlObj.searchParams.get('limit')) || 24;
      const continuationToken = urlObj.searchParams.get('continuationToken') || undefined;
      const filter = urlObj.searchParams.get('filter') || 'all';
      const sort = urlObj.searchParams.get('sort') || 'newest';
      const search = urlObj.searchParams.get('q') || '';

      const result = await handleListMedia({ limit, continuationToken, filter, sort, search });
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/resolve' && (req.method === 'GET' || req.method === 'POST')) {
      const v = urlObj.searchParams.get('v') || urlObj.searchParams.get('key') || urlObj.searchParams.get('file');
      const id = urlObj.searchParams.get('id');
      const filename = urlObj.searchParams.get('filename') || urlObj.searchParams.get('name');
      const postBody = req.method === 'POST' ? await parseJsonBody(req) : {};

      const targetKey = v || postBody.key || postBody.v || postBody.file || '';
      const targetId = id || postBody.id || '';
      const targetFilename = filename || postBody.filename || postBody.name || '';

      if (!targetKey && !targetId && !targetFilename) {
        sendJson(res, 400, { error: 'Media identifier or filename is required' });
        return true;
      }

      const result = await handleResolveMedia({ key: targetKey, id: targetId, filename: targetFilename });
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/stats' && req.method === 'GET') {
      const result = await handleStats();
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/upload/presign' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await handlePresignPut(body);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/upload/multipart/start' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await handleMultipartStart(body);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/upload/multipart/sign-part' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await handleMultipartSignPart(body);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/upload/multipart/complete' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await handleMultipartComplete(body);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/upload/multipart/abort' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await handleMultipartAbort(body);
      sendJson(res, 200, result);
      return true;
    }

    sendJson(res, 404, { error: 'Not found' });
    return true;
  } catch (err: any) {
    sendJson(res, 400, { error: err.message || 'API request error' });
    return true;
  }
}
