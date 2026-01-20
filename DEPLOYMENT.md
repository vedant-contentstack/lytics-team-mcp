# Deployment Guide

## ✅ Local Deployment (Recommended)

The local deployment uses **stdio transport** which is the most reliable option for Cursor.

### Setup

1. **Build the project:**
```bash
npm install
npm run build
```

2. **Update your `~/.cursor/mcp.json`:**
```json
{
  "mcpServers": {
    "lytics": {
      "command": "node",
      "args": ["/absolute/path/to/lytics-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key",
        "HUGGINGFACE_API_KEY": "your-hf-api-key",
        "TEAM_ID": "your-team-id",
        "USER_ID": "your-user-id"
      }
    }
  }
}
```

3. **Restart Cursor**

The MCP tools will now be available in your Cursor chat!

---

## ⚠️ Vercel Deployment (Current Limitations)

The current Vercel deployment has issues with the **StreamableHTTPServerTransport** due to serverless limitations:

### Known Issues

| Issue | Cause |
|-------|-------|
| "Server not initialized" | StreamableHTTP expects stateful connections |
| Session state lost | Each serverless invocation is independent |
| Cold starts | Memory cleared between invocations |

### Why It Doesn't Work

```
Request 1 (initialize) → Cold Instance A → Creates session
Request 2 (tool call)  → Cold Instance B → Session doesn't exist ❌
```

Vercel's serverless functions don't guarantee the same instance will handle subsequent requests.

---

## 🚀 Alternative: Deploy to Stateful Platforms

For HTTP-based MCP deployment, use platforms that support persistent containers:

### Recommended Platforms

| Platform | Why It Works | Deploy Command |
|----------|-------------|----------------|
| **Railway** | Persistent containers | `railway up` |
| **Fly.io** | Long-running VMs | `fly deploy` |
| **Render** | Persistent services | Connect GitHub |
| **Google Cloud Run** | Session affinity support | `gcloud run deploy` |

### Example: Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Add environment variables
railway variables set SUPABASE_URL=xxx
railway variables set SUPABASE_SERVICE_KEY=xxx
railway variables set HUGGINGFACE_API_KEY=xxx
```

Then update your `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "lytics": {
      "url": "https://your-app.up.railway.app/api/mcp?team_id=my-team&user_id=vedant"
    }
  }
}
```

---

## 📊 Deployment Comparison

| Deployment Type | Pros | Cons | Use Case |
|----------------|------|------|----------|
| **Local (stdio)** | ✅ Most reliable<br>✅ No network latency<br>✅ Free | ❌ Single user<br>❌ Cursor must be running | **Recommended for personal use** |
| **Vercel** | ✅ Easy to deploy<br>✅ Auto-scaling | ❌ Session state issues<br>❌ Cold starts | **Not recommended currently** |
| **Railway/Fly.io** | ✅ Stateful<br>✅ Good for teams<br>✅ Always available | ⚠️ Costs money<br>⚠️ More setup | **Best for team use** |

---

## 🔧 Troubleshooting

### Local Deployment

**Issue:** MCP tools not appearing in Cursor

**Solution:**
1. Check the path in mcp.json is absolute
2. Ensure `npm run build` completed successfully
3. Restart Cursor completely (quit and reopen)
4. Check Cursor logs: `Help` → `Show Logs` → Look for MCP errors

### Vercel Deployment

**Issue:** "Server not initialized" error

**Status:** Known limitation with serverless architecture

**Workaround:** Switch to local deployment or Railway/Fly.io

---

## 📝 Future Improvements

To make Vercel deployment work, we would need to:

1. **Switch to SSE Transport** with external session storage (Redis)
2. **Use Vercel Edge Functions** with Durable Objects
3. **Implement stateless protocol** that doesn't require session continuity

For now, local deployment is the most reliable option.
