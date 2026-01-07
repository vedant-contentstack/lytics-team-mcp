-- ============================================
-- LYTICS MCP - Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create conversations table
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

-- 3. Create indexes for fast queries
create index idx_conversations_team on conversations(team_id);
create index idx_conversations_user on conversations(user_id);
create index idx_conversations_created on conversations(created_at desc);
create index idx_conversations_tags on conversations using gin(tags);

-- 4. Create vector similarity index (HNSW for fast search)
create index idx_conversations_embedding on conversations 
  using hnsw (embedding vector_cosine_ops);

-- 5. Create search function
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
language plpgsql
as $$
begin
  return query
  select
    c.id,
    c.title,
    c.summary,
    c.user_id,
    c.tags,
    (1 - (c.embedding <=> query_embedding))::float as similarity,
    c.created_at,
    c.repo_context
  from conversations c
  where c.team_id = team_id_filter
    and (c.is_public = true or (include_private and c.user_id = user_id_filter))
    and c.embedding is not null
    and (1 - (c.embedding <=> query_embedding)) > similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_limit;
end;
$$;

-- 6. Auto-update timestamp trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on conversations
  for each row
  execute function update_updated_at();

-- ============================================
-- ✅ Setup complete! 
-- Your Lytics MCP database is ready.
-- ============================================
