# 🧠 Lytics Team MCP

**Team Knowledge Base for Cursor AI Conversations**

Model Context Protocol (MCP) server that stores and searches AI conversations across your team. When someone tackles a problem, their conversation is saved and becomes searchable—so when a teammate faces a similar issue, they get instant access to relevant past discussions.

## ✨ Features

- **💾 Save Conversations** - Store valuable AI chats with titles, tags, and auto-generated summaries
- **🔍 Semantic Search** - Find related discussions using AI-powered vector similarity
- **👥 Team Sharing** - Public conversations visible to all team members
- **🔒 Privacy Control** - Mark conversations as private when needed
- **🏷️ Organization** - Tag and categorize conversations for easy browsing
- **📁 Context Aware** - Track which repos and files were discussed

## 🚀 Quick Start

### 1. Install via npm

```bash
# Install globally
npm install -g lytics-team-mcp

# Or install locally in your project
npm install lytics-team-mcp
```

### 2. Get Configuration from Your Team Lead

Your team lead will provide you with:
- `SUPABASE_URL` - Shared team Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key (keep secret!)
- `TEAM_ID` - Your team identifier

### 3. Get Hugging Face API Token (Free!)

1. Create a free account at [huggingface.co](https://huggingface.co)
2. Go to **Settings → Access Tokens**
3. Create a new token with `read` access

### 4. Configure Cursor

Add Lytics to your Cursor MCP configuration:

**For macOS/Linux:** `~/.cursor/mcp.json`  
**For Windows:** `%APPDATA%\Cursor\mcp.json`

```json
{
  "mcpServers": {
    "lytics": {
      "command": "npx",
      "args": ["-y", "lytics-team-mcp"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key",
        "HUGGINGFACE_API_KEY": "hf_your-token-here",
        "TEAM_ID": "your-team-name"
      }
    }
  }
}
```

**Alternative (if installed globally):**

```json
{
  "mcpServers": {
    "lytics": {
      "command": "lytics-team-mcp",
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key",
        "HUGGINGFACE_API_KEY": "hf_your-token-here",
        "TEAM_ID": "your-team-name"
      }
    }
  }
}
```

**Note:** Your User ID is auto-generated on first run and stored in `~/.lytics-mcp/user-id.txt`. You'll see it displayed when the server starts.

### 5. Restart Cursor

Restart Cursor to load the MCP server. You should now have access to Lytics tools!

**First time setup?** On first run, Lytics will generate a unique User ID for you automatically.

## 🛠️ Available Tools

Once configured, you can use these tools in Cursor:

### `save_conversation`

Save the current chat to your team's knowledge base with **automatic content detection**.

**🎯 Smart Features:**
- **Auto-Detection**: Automatically finds and uses exported conversation markdown files
- **Content Validation**: Warns if code blocks or important content is missing
- **Manual Override**: Can specify `file_path` to use a specific exported file

```
"Save this conversation about fixing the auth bug"
→ Cursor will automatically find the exported .md file with complete content
→ Falls back to provided content if no export found
```

**Pro Tip**: For conversations with lots of code, Cursor's export might miss code blocks. The MCP automatically detects exported `.md` files in your workspace (like `cursor_conversation_export.md`) and uses them instead to ensure nothing is lost!

### `search_knowledge`

Find related past conversations.

```
"Search if anyone has dealt with PostgreSQL connection pooling issues"
→ Returns matching conversations with similarity scores
```

### `find_related`

Automatically find relevant discussions based on your current context.

```
"Find related team discussions about this error"
→ Analyzes your context and returns similar past conversations
```

### `get_conversation`

Get the full content of a saved conversation.

```
"Show me the full conversation with ID abc-123"
```

### `list_conversations`

Browse saved conversations.

```
"List recent team conversations tagged with 'frontend'"
```

### `update_visibility`

Toggle between public and private.

```
"Make conversation abc-123 private"
```

### `delete_conversation`

Remove a conversation you created.

```
"Delete my conversation abc-123"
```

### `get_user_id`

Get your unique User ID to share with teammates or use on another machine.

```
"What is my user ID?"
"Show me my user ID"
```

## 💡 Usage Examples

### Saving a Valuable Discussion

After solving a tricky bug:

> "Save this conversation as 'Fixed infinite loop in useEffect with proper deps' with tags: react, hooks, bug-fix"

The MCP will:
1. Look for exported conversation `.md` files in your workspace
2. Use the most recent one that matches (ensuring code blocks are preserved)
3. Fall back to Cursor's provided content if no export found
4. Warn you if content seems incomplete

### Checking Existing Knowledge

Before diving into a new problem:

> "Search the team knowledge base for discussions about AWS Lambda cold starts"

### Automatic Context Discovery

While debugging:

> "Find if anyone on the team has discussed this error: 'Cannot read property of undefined'"

## 🔧 Ensuring Complete Conversation Saves

### The Problem
Sometimes when Cursor saves a conversation, it might omit code blocks or truncate content. This means valuable implementation details could be lost!

### The Solution ✨
Lytics MCP has **automatic content detection** built-in:

**1. Auto-Detection (Recommended)**
```
1. Export your conversation from Cursor (creates cursor_*.md file)
2. Tell Cursor: "Save this conversation"
3. MCP automatically finds and uses the exported file
4. All code blocks and content preserved! ✅
```

**2. Manual File Path**
```
"Save conversation from file cursor_my_conversation.md with title 'Profile Creation Deep Dive'"
→ MCP reads directly from the specified file
```

**3. Direct Content (Fallback)**
```
If no export file is found, uses content provided by Cursor
→ Shows warnings if content appears incomplete
```

### Best Practice
For important conversations with lots of code:
1. Export the conversation (Cmd/Ctrl + Shift + E or via menu)
2. Immediately save it to your knowledge base
3. The MCP will automatically use the exported file with complete content!

## 🏢 Team Setup

### For Team Leads (One-Time Setup)

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a free account
   - Create a new project for your team

2. **Run Database Migration**
   - Go to **SQL Editor** in Supabase
   - Run the migration from `supabase/migrations/001_initial_schema.sql` in this repo
   - This creates the conversations table with vector search capabilities

3. **Get Credentials**
   - Go to **Settings → API** in Supabase
   - Copy your Project URL → `SUPABASE_URL`
   - Copy your Service Role Key → `SUPABASE_SERVICE_KEY`

4. **Share with Team**
   - Provide team members with:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_KEY` (securely!)
     - `TEAM_ID` (choose a team identifier like `acme-frontend`)
   - Each team member will auto-generate their own `USER_ID` on first run

### For Team Members

1. Get credentials from your team lead
2. Get your own Hugging Face API token (free)
3. Follow the Quick Start guide above to configure Cursor

### Environment Variables

| Variable               | Required? | Source      | Description                           |
| ---------------------- | --------- | ----------- | ------------------------------------- |
| `SUPABASE_URL`         | ✅ Yes | Team Lead   | Shared Supabase project URL           |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | Team Lead   | Service role key (keep secret!)       |
| `HUGGINGFACE_API_KEY`  | ✅ Yes | You (free)  | Your personal HF token for embeddings |
| `TEAM_ID`              | ✅ Yes | Team Lead   | Shared team identifier                |
| `USER_ID`              | Auto    | Auto-generated | Your unique ID (no need to set)    |

**User ID:** 🎉 **Auto-generated!** No need to set it manually.

On first run, a unique User ID is generated and stored in `~/.lytics-mcp/user-id.txt`. This ID:
- ✅ Identifies your conversations
- ✅ Can be shared to fetch your private conversations
- ✅ Persists across Cursor restarts
- ✅ Can be copied to another machine if needed

### Managing Your User ID

**View your User ID:**
```bash
cat ~/.lytics-mcp/user-id.txt
```

**Use on another machine:**
```bash
# Copy the ID from your original machine
echo "your-user-id-here" > ~/.lytics-mcp/user-id.txt
```

**Reset your User ID** (creates a new identity):
```bash
rm ~/.lytics-mcp/user-id.txt
# Will generate new ID on next run
```

## 🔐 Security Notes

- **Service Key**: Never commit or share your Supabase service key
- **Private Conversations**: Only visible to the creator
- **Team Isolation**: Conversations are scoped to `TEAM_ID`
- **No Chat Logging**: Lytics only stores what you explicitly save

## 📊 Cost Considerations

- **Hugging Face**: 🆓 Free tier includes embeddings & summarization
- **Supabase Free Tier**: 500MB database, plenty for thousands of conversations
- **Storage Optimization**: Conversations are automatically compressed using gzip (70-90% reduction)
- **Total**: $0 for small-medium teams!

### Storage Details

Lytics uses **automatic content compression** to minimize database storage:
- Conversation content is compressed with gzip before saving
- Reduces storage by 70-90% for text-heavy conversations
- Transparent decompression when retrieving conversations
- Backward compatible with uncompressed legacy data

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Test the server locally
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... HUGGINGFACE_API_KEY=... TEAM_ID=test node dist/index.js
```

## 🤝 Contributing

Contributions welcome! Some ideas:

- [ ] Web dashboard for browsing conversations
- [ ] Slack/Discord integration for notifications
- [ ] Automatic conversation tagging
- [ ] Team analytics and insights
- [ ] Export/backup functionality

## 📄 License

MIT

---

Built with ❤️ for teams who believe in sharing knowledge.
