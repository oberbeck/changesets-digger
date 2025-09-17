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
