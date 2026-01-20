# Publishing to npm

## Prerequisites

1. **npm account**: Create one at [npmjs.com](https://npmjs.com)
2. **npm login**: Run `npm login` in your terminal

## Publishing Steps

### 1. Prepare the Package

```bash
# Ensure everything is built
npm run build

# Test the package locally
npm pack

# This creates a .tgz file you can inspect
tar -tzf vedant-contentstack-lytics-mcp-1.0.0.tgz
```

### 2. Version Bump (if needed)

```bash
# For bug fixes
npm version patch  # 1.0.0 → 1.0.1

# For new features
npm version minor  # 1.0.0 → 1.1.0

# For breaking changes
npm version major  # 1.0.0 → 2.0.0
```

### 3. Publish to npm

```bash
# Publish (first time)
npm publish --access public

# For subsequent updates
npm publish
```

### 4. Verify Publication

```bash
# Check it's live
npm view @vedant-contentstack/lytics-mcp

# Test installation
npx @vedant-contentstack/lytics-mcp --help
```

## Package Scope

The package is scoped under `@vedant-contentstack/` which means:
- ✅ No name conflicts with other packages
- ✅ Clear ownership
- ✅ Can be public or private

If you want an unscoped name (e.g., `lytics-mcp`), you'll need to:
1. Check if it's available: `npm search lytics-mcp`
2. Remove the `@vedant-contentstack/` prefix from package.json name
3. Ensure uniqueness on npm

## What Gets Published

Based on the `files` field in package.json:
- ✅ `dist/` - Built JavaScript files
- ✅ `supabase/migrations/` - Database schema
- ✅ `README.md` - Documentation
- ✅ `LICENSE` - License file

**Excluded** (via .npmignore):
- ❌ Source TypeScript files (`src/`)
- ❌ Vercel deployment files (`api/`, `vercel.json`)
- ❌ Development configs
- ❌ Git history

## After Publishing

### Update Documentation

1. Update README with correct npm install command
2. Update Cursor configuration examples
3. Add badges to README (optional):

```markdown
[![npm version](https://badge.fury.io/js/%40vedant-contentstack%2Flytics-mcp.svg)](https://www.npmjs.com/package/@vedant-contentstack/lytics-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

### Tag the Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Create GitHub Release

1. Go to GitHub repository
2. Click "Releases" → "Create a new release"
3. Select the tag you just created
4. Add release notes
5. Publish

## Continuous Publishing

### Automatic Publishing with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add your npm token to GitHub repository secrets:
1. Generate token: `npm token create`
2. Add to GitHub: Settings → Secrets → New repository secret
3. Name: `NPM_TOKEN`
4. Value: Your npm token

## Unpublishing (Emergency Only)

```bash
# Unpublish a specific version (within 72 hours)
npm unpublish @vedant-contentstack/lytics-mcp@1.0.0

# Deprecate instead (better option)
npm deprecate @vedant-contentstack/lytics-mcp@1.0.0 "Use version 1.0.1 instead"
```

⚠️ **Warning**: Unpublishing is permanent and can break projects depending on your package. Use with caution!

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged in: `npm whoami`
- Check package name isn't taken: `npm search @vedant-contentstack/lytics-mcp`
- For scoped packages, ensure `--access public` is set

### "Package name too similar to existing package"

- npm prevents names too similar to existing packages
- Change the package name in package.json
- Or use a scoped name: `@yourscope/lytics-mcp`

### Build Failures

```bash
# Clean and rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

## Best Practices

1. **Test before publishing**: Always run tests and build before publishing
2. **Semantic versioning**: Follow semver strictly
3. **Changelog**: Maintain a CHANGELOG.md
4. **No secrets**: Never include API keys or credentials
5. **README first**: Ensure README is clear and up-to-date
6. **Deprecation warnings**: Use `npm deprecate` instead of unpublish

## Support & Maintenance

After publishing, monitor:
- GitHub issues
- npm downloads (visible on npm package page)
- User feedback
- Security vulnerabilities: `npm audit`

Update regularly with bug fixes and improvements!
