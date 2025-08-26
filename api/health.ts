import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
