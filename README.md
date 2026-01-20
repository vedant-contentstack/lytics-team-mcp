# 🧠 Lytics MCP

**Team Knowledge Base for Cursor AI Conversations**

Lytics is a Model Context Protocol (MCP) server that stores and searches AI conversations across your team. When someone tackles a problem, their conversation is saved and becomes searchable—so when a teammate faces a similar issue, they get instant access to relevant past discussions.

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

### 2. Set Up Supabase (One-time setup)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run this migration:

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Create conversations table
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  team_id text not null,
  title text not null,
  summary text,
  content text not null,
  embedding vector(384),
  is_public boolean default true,
  tags text[] default '{}',
  repo_context text,
  file_context text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes
create index idx_conversations_team on conversations(team_id);
create index idx_conversations_user on conversations(user_id);
create index idx_conversations_embedding on conversations using hnsw (embedding vector_cosine_ops);

-- Create search function
create or replace function search_conversations(
  query_embedding vector(384),
  team_id_filter text,
  user_id_filter text,
  include_private boolean default false,
  match_limit int default 5,
  similarity_threshold float default 0.5
)
returns table (
  id uuid,
  title text,
  summary text,
  user_id text,
  tags text[],
  similarity float,
  created_at timestamptz,
  repo_context text
)
language plpgsql as $$
begin
  return query
  select c.id, c.title, c.summary, c.user_id, c.tags,
    (1 - (c.embedding <=> query_embedding))::float as similarity,
    c.created_at, c.repo_context
  from conversations c
  where c.team_id = team_id_filter
    and (c.is_public = true or (include_private and c.user_id = user_id_filter))
    and c.embedding is not null
    and (1 - (c.embedding <=> query_embedding)) > similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_limit;
end;
$$;
```

4. Get your credentials from **Settings → API**:
   - Project URL → `SUPABASE_URL`
   - Service Role Key → `SUPABASE_SERVICE_KEY`

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

## 🛠️ Available Tools

Once configured, you can use these tools in Cursor:

### `save_conversation`

Save the current chat to your team's knowledge base.

```
"Save this conversation about fixing the auth bug"
→ Cursor will use save_conversation with title, content, tags
```

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

### Checking Existing Knowledge

Before diving into a new problem:

> "Search the team knowledge base for discussions about AWS Lambda cold starts"

### Automatic Context Discovery

While debugging:

> "Find if anyone on the team has discussed this error: 'Cannot read property of undefined'"

## 🏢 Team Setup

### For Team Leads

1. Create a shared Supabase project for your team
2. Share the configuration (sans sensitive keys) with team members
3. Each team member uses their own `USER_ID` but same `TEAM_ID`

### Environment Variables

| Variable               | Required? | Description                           |
| ---------------------- | --------- | ------------------------------------- |
| `SUPABASE_URL`         | ✅ Yes | Your Supabase project URL             |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | Service role key (keep secret!)       |
| `HUGGINGFACE_API_KEY`  | ✅ Yes | Free token for embeddings & summaries |
| `TEAM_ID`              | ✅ Yes | Shared team identifier                |

**User ID:** 🎉 **Auto-generated!** No need to set it manually.

On first run, a unique User ID is generated and stored in `~/.lytics-mcp/user-id.txt`. This ID:
- ✅ Identifies your conversations
- ✅ Can be shared to fetch your private conversations
- ✅ Persists across Cursor restarts
- ✅ Can be copied to another machine if needed

### Recommended Team IDs

Use consistent identifiers:

- `TEAM_ID`: Your org/team name (e.g., `acme-frontend`, `startup-core`)

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
- **Total**: $0 for small-medium teams!

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Test the server locally
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... HUGGINGFACE_API_KEY=... TEAM_ID=test USER_ID=dev node dist/index.js
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
