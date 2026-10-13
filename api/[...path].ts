import type { IncomingMessage, ServerResponse } from 'http';
import { apiRouter } from '../server/router.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const handled = await apiRouter(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
}
