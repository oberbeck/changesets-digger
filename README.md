# Changesets Digger

Git-based changelog generation from changeset history. Generate changelogs by reconstructing changesets from git
history at each version tag.

## Features

- 🏷️ **Git-based**: Uses git version tags as source of truth
- 📝 **Build-time generation**: Changelogs generated during build, not committed
- 🔄 **Preserves changesets**: Changesets are not deleted, keeping full history
- 📊 **Semantic versioning**: Calculates versions from changeset severity
- 📁 **Flexible output**: Individual markdown files + JSON index

## Installation

TODO

## Setup

No setup required! The tool automatically creates the necessary structure on first use.

## Usage

### Creating Changesets

Use the built-in changeset creation:

**Interactive mode:**

```bash
npx changesets-digger add
# Will prompt for type and description
```

**Non-interactive mode (great for CI/automation):**

```bash
npx changesets-digger add --type patch --message "Fix authentication timeout issue"
npx changesets-digger add --type minor --message "Add dark mode support"
npx changesets-digger add --type major --message "Breaking API changes"
```

**Changeset file format:**

```markdown
---
type: patch
---

Fix authentication timeout issue
```

### Creating Release Tags

Calculate next version and create a git tag:

```bash
npx changesets-digger tag

# Dry run to see what would happen
npx changesets-digger tag --dry-run
```

### Generating Changelogs

Generate changelog files from git history:

```bash
npx changesets-digger generate

# Custom output directory
npx changesets-digger generate -o public/changelogs

# Dry run to see what would be generated
npx changesets-digger generate --dry-run
```

## Workflow

1. **Development**: `npx changesets-digger add` (add changes during PRs)
2. **Release**: `npx changesets-digger tag` (creates git tag)
3. **Build**: `npx changesets-digger generate` (generates changelog assets)

## Output Structure

```
src/assets/changelogs/
├── index.json          # Metadata about all versions
├── 1.0.0.md            # Individual changelog files
├── 1.1.0.md
└── 1.2.0.md
```

### index.json

```json
{
  "versions": [
    {
      "version": "1.2.0",
      "date": "2024-01-15T10:30:00.000Z",
      "fileUrl": "1.2.0.md",
      "summary": "Release 1.2.0"
    }
  ],
  "latestVersion": "1.2.0"
}
```

### Version Markdown Files

```markdown
# What's New in 1.2.0

_Released on January 15, 2024_

### 🎉 Added

- New user dashboard with improved analytics
- Dark mode support

### 🐛 Fixed

- Fixed authentication timeout issue
- Resolved mobile layout problems
```

## CLI Options

```bash
npx changesets-digger --help
```

## FAQ

### What is Changesets Digger?

Changesets Digger is a changelog generation tool that builds on the changeset workflow concept. It generates user-facing changelogs at build time by reconstructing changeset history from Git tags, avoiding the need to commit version files back to your repository.

### How does it work?

The tool uses Git tags as the single source of truth for versioning. During your build process, it reads changeset files from your Git history and generates markdown changelog files along with a JSON index for programmatic access.

### When should I use this tool?

This tool works well for applications where you want:

- Clean Git history without version-bump commits
- Separation between technical commit messages and user-facing changelogs
- Build-time changelog generation rather than committed files

### How does this compare to @changesets/cli?

This repository uses @changesets/cli to manage its own CLI versioning. Both Changesets Digger and @changesets/cli follow a similar changeset-based workflow, but they serve slightly different purposes. @changesets/cli updates and commits version files directly to your repository during the release process, which is especially helpful for libraries and SDKs where managing API versions is important.

On the other hand, Changesets Digger is designed to generate user-facing changelogs from Git tags at build time, without adding extra version files to your repository. This makes it a good fit for end-user applications, like graphical interfaces, where you want to highlight changes for your users rather than focus on technical versioning files.

### How does this compare to semantic-release?

semantic-release analyzes commit messages to automatically determine versions and generate changelogs. This tool requires explicit changeset files but allows for more descriptive, user-focused release notes while keeping commit messages technical and atomic.

### Do I need to change my existing workflow?

The tool integrates into most CI/CD workflows with minimal changes. You'll add changeset creation during development and changelog generation during your build process. Your existing Git tagging and release processes can remain largely the same.

### Can I customize the output format?

The tool creates a separate markdown file for each version, along with a JSON index. You can choose where these files are saved and use them in your documentation or website as you like. At the moment, custom renderers aren’t supported yet, but this feature is planed in the future.

### What happens to my changeset files?

Changeset files remain in your Git history and are not deleted. This preserves the full context and reasoning behind each change for future reference.
