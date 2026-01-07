/**
 * Health check endpoint
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: "ok",
    service: "lytics-mcp",
    timestamp: new Date().toISOString(),
  });
}

