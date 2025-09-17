import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getChangesetCount,
  hasChangesets,
  readChangesets,
} from '../src/core/changeset-reader';

describe('ChangesetReader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'changeset-reader-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  function createChangesetFile(filename: string, content: string) {
    const changesetDir = path.join(tempDir, '.changeset');
    fs.mkdirSync(changesetDir, { recursive: true });
    fs.writeFileSync(path.join(changesetDir, filename), content);
  }

  describe('readChangesets', () => {
    it('should read valid changeset files', async () => {
      createChangesetFile(
        'test-1.md',
        `---
type: minor
---

Add new feature for users`,
      );

      createChangesetFile(
        'test-2.md',
        `---
type: patch
---

Fix critical bug in authentication`,
      );

      const changesets = await readChangesets(tempDir);

      expect(changesets).toHaveLength(2);

      expect(changesets[0].id).toBe('test-1');
      expect(changesets[0].summary).toBe('Add new feature for users');
      expect(changesets[0].releases).toHaveLength(1);
      expect(changesets[0].releases[0].type).toBe('minor');

      expect(changesets[1].id).toBe('test-2');
      expect(changesets[1].summary).toBe('Fix critical bug in authentication');
      expect(changesets[1].releases[0].type).toBe('patch');
    });

    it('should handle new simplified type format', async () => {
      createChangesetFile(
        'simple-format.md',
        `---
type: major
---

Breaking changes in new format`,
      );

      const changesets = await readChangesets(tempDir);

      expect(changesets).toHaveLength(1);
      expect(changesets[0].releases).toHaveLength(1);
      expect(changesets[0].releases[0].type).toBe('major');
      expect(changesets[0].summary).toBe('Breaking changes in new format');
    });

    it('should handle multiline summaries', async () => {
      createChangesetFile(
        'multiline.md',
        `---
type: minor
---

This is a longer summary that spans
multiple lines and includes various
details about the changes made.

- Added feature A
- Improved feature B
- Fixed issue C`,
      );

      const changesets = await readChangesets(tempDir);

      expect(changesets).toHaveLength(1);
      expect(changesets[0].summary).toContain('This is a longer summary');
      expect(changesets[0].summary).toContain('multiple lines');
      expect(changesets[0].summary).toContain('- Added feature A');
    });

    it('should ignore README files', async () => {
      createChangesetFile('README.md', 'This is a README file');
      createChangesetFile(
        'valid.md',
        `---
type: patch
---

Actual changeset`,
      );

      const changesets = await readChangesets(tempDir);

      expect(changesets).toHaveLength(1);
      expect(changesets[0].id).toBe('valid');
    });

    it('should fail on invalid frontmatter by default', async () => {
      createChangesetFile(
        'invalid.md',
        `This file has no frontmatter
just plain content`,
      );

      await expect(readChangesets(tempDir)).rejects.toThrow(
        'Invalid changeset file',
      );
    });

    it('should handle invalid frontmatter gracefully with ignoreErrors flag', async () => {
      createChangesetFile(
        'invalid.md',
        `This file has no frontmatter
just plain content`,
      );

      const changesets = await readChangesets(tempDir, { ignoreErrors: true });

      expect(changesets).toHaveLength(1);
      expect(changesets[0].id).toBe('invalid');
      expect(changesets[0].summary).toBe(
        'This file has no frontmatter\njust plain content',
      );
      expect(changesets[0].releases).toHaveLength(0);
    });

    it('should throw error when .changeset directory does not exist', async () => {
      await expect(readChangesets(tempDir)).rejects.toThrow(
        'There is no .changeset directory in this project',
      );
    });
  });

  describe('hasChangesets', () => {
    it('should return true when .changeset directory exists', () => {
      fs.mkdirSync(path.join(tempDir, '.changeset'));
      expect(hasChangesets(tempDir)).toBe(true);
    });

    it('should return false when .changeset directory does not exist', () => {
      expect(hasChangesets(tempDir)).toBe(false);
    });
  });

  describe('getChangesetCount', () => {
    it('should return correct count of changeset files', async () => {
      createChangesetFile(
        'test-1.md',
        `---
type: patch
---
Fix 1`,
      );
      createChangesetFile(
        'test-2.md',
        `---
type: minor
---
Feature 2`,
      );
      createChangesetFile('README.md', 'Should be ignored');

      const count = await getChangesetCount(tempDir);
      expect(count).toBe(2);
    });

    it('should return 0 when no changeset directory exists', async () => {
      const count = await getChangesetCount(tempDir);
      expect(count).toBe(0);
    });

    it('should return 0 when changeset directory is empty', async () => {
      fs.mkdirSync(path.join(tempDir, '.changeset'));

      const count = await getChangesetCount(tempDir);
      expect(count).toBe(0);
    });
  });
});
