-- ============================================
-- LYTICS MCP - Reset & Fresh Install
-- ⚠️  WARNING: This drops all existing data!
-- ============================================

-- Drop existing objects
drop trigger if exists conversations_updated_at on conversations;
drop trigger if exists update_conversations_updated_at on conversations;
drop function if exists search_conversations;
drop function if exists update_updated_at;
drop function if exists update_updated_at_column;
drop table if exists conversations;

-- Now run the main setup...

