# Changelog

## [1.1.0] - 2026-01-20

### Added - Automatic Complete Content Saving

**Problem Solved**: Previously, when saving conversations, Cursor would sometimes omit code blocks or truncate content, resulting in incomplete knowledge base entries.

**New Features**:

1. **Automatic Export File Detection** 🎯
   - MCP now automatically scans the workspace for exported conversation markdown files (`cursor_*.md`)
   - When you say "Save this conversation", it will use the most recent exported file
   - Ensures ALL code blocks, examples, and formatting are preserved
   - Enabled by default with `auto_find_export: true`

2. **Manual File Path Support** 📁
   - New `file_path` parameter to explicitly specify an exported conversation file
   - Usage: `"Save conversation from file cursor_my_convo.md"`
   - Bypasses Cursor's content truncation entirely

3. **Content Validation & Warnings** ⚠️
   - Automatically detects when content appears incomplete
   - Warns if code blocks are missing but code is discussed
   - Warns if content seems truncated
   - Helps ensure high-quality knowledge base entries

4. **Smart Source Selection** 🧠
   - Priority 1: Explicit `file_path` parameter
   - Priority 2: Auto-detected exported file (if >1.5x larger than provided content)
   - Priority 3: Cursor-provided content (with validation warnings)

### Changed

- `save_conversation` tool now accepts optional `content` parameter (was required)
- Tool description updated to emphasize importance of complete content
- Return value now includes `source` field showing where content came from
- Return value now includes `warnings` array if content quality issues detected

### Technical Details

**New Parameters**:
```typescript
{
  content?: string,           // Now optional
  file_path?: string,         // NEW: Path to exported file
  auto_find_export?: boolean, // NEW: Enable auto-detection (default: true)
  // ... existing parameters
}
```

**Return Value**:
```typescript
{
  id: string,
  summary: string | null,
  source?: string,      // NEW: Where content came from
  warnings?: string[],  // NEW: Content quality warnings
}
```

**Auto-Detection Logic**:
- Searches for `cursor_*.md` files in workspace
- Excludes `cursor_jstag_*.md` files
- Prefers files matching the conversation title
- Falls back to most recently modified file

### Usage Examples

**Before** (Content might be incomplete):
```
"Save this conversation about profile creation"
→ Might lose code blocks ❌
```

**After** (Automatic complete content):
```
1. Export conversation (Cmd+Shift+E)
2. "Save this conversation about profile creation"
→ MCP auto-detects export file
→ All code blocks preserved ✅
```

**Manual file specification**:
```
"Save conversation from file cursor_profile_deep_dive.md with title 'Profile Creation Pipeline'"
→ Uses specified file directly ✅
```

### Benefits

✅ **No More Lost Code**: All implementation details preserved  
✅ **Zero Extra Work**: Works automatically with exported files  
✅ **Smart Validation**: Warns you if something seems wrong  
✅ **Flexible Options**: Auto-detect, manual file, or direct content  
✅ **Backward Compatible**: Still works with direct content parameter  

### Migration Guide

No breaking changes! Existing code continues to work. To get the benefits:

1. When saving important conversations, export them first (Cmd/Ctrl+Shift+E)
2. Then save to knowledge base - MCP will auto-detect and use the export
3. Or explicitly pass `file_path` parameter for manual control

### Testing

Tested with real conversation export:
- Original exported file: 391 lines, 13 code blocks
- Previously saved version: 184 lines, 0 code blocks ❌
- New version with auto-detect: 391 lines, 13 code blocks ✅

**Result**: 100% content preservation achieved!
