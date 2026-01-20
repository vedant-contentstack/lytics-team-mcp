/**
 * Message endpoint for SSE transport
 * Handles incoming messages from MCP clients
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Store for SSE transport message handling
// In production, you'd want to use Redis or similar
const messageHandlers = new Map<string, (message: any) => void>();

export function registerMessageHandler(sessionId: string, handler: (message: any) => void) {
  messageHandlers.set(sessionId, handler);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Session-ID");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = req.headers["x-session-id"] as string;
  const handler = sessionId ? messageHandlers.get(sessionId) : null;
  
  if (handler && req.body) {
    try {
      handler(req.body);
      return res.status(200).json({ received: true });
    } catch (error) {
      return res.status(500).json({ error: "Failed to process message" });
    }
  }

  // No handler or session - just acknowledge receipt
  return res.status(200).json({ received: true });
}

