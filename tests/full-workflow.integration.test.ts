import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { withRepo } from './test-helpers';

describe('Changesets Digger - Full Workflow Integration', () => {
  describe('Basic Workflow', () => {
    it(
      'should handle the complete workflow: changesets -> manual tags -> changelog generation',
      withRepo(async (repo) => {
        // Step 1: Create some initial changesets
        repo.createChangeset('feature-1', 'minor', 'Add new user dashboard');
        repo.createChangeset(
          'fix-1',
          'patch',
          'Fix authentication timeout issue',
        );

        // Commit the changesets
        repo.makeChangesAndCommit({}, 'Add changesets for v0.1.0');

        // Step 2: Create a tag for version 0.1.0
        repo.createTag('v0.1.0', 'Release v0.1.0');

        // Step 3: Create more changesets for next version
        repo.createChangeset('feature-2', 'minor', 'Add dark mode support');
        repo.createChangeset('breaking-1', 'major', 'Refactor API endpoints');

        // Commit the new changesets
        repo.makeChangesAndCommit({}, 'Add changesets for next version');

        // Step 4: Create another tag
        repo.createTag(
          'v1.0.0',
          'Release v1.0.0 - Major version with breaking changes',
        );

        // Step 5: Add one more changeset for upcoming version
        repo.createChangeset('fix-2', 'patch', 'Fix mobile layout problems');
        repo.makeChangesAndCommit({}, 'Add changeset for upcoming patch');

        // Step 6: Generate changelogs
        const generateOutput = repo.execDiggerCommand('generate --dry-run');

        // Verify the output mentions all versions
        expect(generateOutput).toContain('Found upcoming version');
        expect(generateOutput).toContain('historical versions');

        // Step 7: Actually generate the changelogs
        repo.execDiggerCommand('generate -o changelogs');

        // Step 8: Verify changelog files were created
        expect(repo.fileExists('changelogs/index.json')).toBe(true);
        expect(repo.fileExists('changelogs/1.0.1.md')).toBe(true); // Upcoming version (patch on 1.0.0)
        expect(repo.fileExists('changelogs/1.0.0.md')).toBe(true); // Historical
        expect(repo.fileExists('changelogs/0.1.0.md')).toBe(true); // Historical

        // Step 9: Verify index.json content
        const indexContent = JSON.parse(repo.readFile('changelogs/index.json'));
        expect(indexContent).toHaveProperty('versions');
        expect(indexContent).toHaveProperty('latestVersion');
        expect(indexContent.versions).toHaveLength(3); // 1.0.1 (upcoming), 1.0.0, 0.1.0

        // Verify version order (newest first)
        expect(indexContent.versions[0].version).toBe('1.0.1'); // Upcoming patch
        expect(indexContent.versions[1].version).toBe('1.0.0');
        expect(indexContent.versions[2].version).toBe('0.1.0');

        // Step 10: Verify specific changelog content
        const upcomingChangelog = repo.readFile('changelogs/1.0.1.md');
        expect(upcomingChangelog).toContain("What's New in 1.0.1");
        expect(upcomingChangelog).toContain('Preview of upcoming release');
        expect(upcomingChangelog).toContain('Fix mobile layout problems');

        // Verify it ONLY contains the new changeset, not old ones
        expect(upcomingChangelog).not.toContain('Add new user dashboard');
        expect(upcomingChangelog).not.toContain('Add dark mode support');
        expect(upcomingChangelog).not.toContain('Refactor API endpoints');

        const v100Changelog = repo.readFile('changelogs/1.0.0.md');
        expect(v100Changelog).toContain("What's New in 1.0.0");
        expect(v100Changelog).toContain('Add dark mode support');
        expect(v100Changelog).toContain('Refactor API endpoints');

        const v010Changelog = repo.readFile('changelogs/0.1.0.md');
        expect(v010Changelog).toContain("What's New in 0.1.0");
        expect(v010Changelog).toContain('Add new user dashboard');
        expect(v010Changelog).toContain('Fix authentication timeout issue');
      }),
    );

    it(
      'should handle CLI-based tagging workflow',
      withRepo(async (repo) => {
        // Create and commit changesets
        repo.createChangeset('feature-1', 'minor', 'Add new feature');
        repo.createChangeset('fix-1', 'patch', 'Fix critical bug');
        repo.makeChangesAndCommit({}, 'Add changesets');

        // Test dry-run to verify version calculation
        const dryRunOutput = repo.execDiggerCommand('tag --dry-run');
        expect(dryRunOutput).toContain('Next version: 0.1.0');
        expect(dryRunOutput).toContain('Would create tag: v0.1.0');

        // Create tag using CLI
        repo.execDiggerCommand('tag --no-push');
        expect(repo.getTags()).toContain('v0.1.0');

        // Add more changesets and create another tag
        repo.createChangeset('major-change', 'major', 'Breaking change');
        repo.makeChangesAndCommit({}, 'Add major change');

        const majorDryRun = repo.execDiggerCommand('tag --dry-run');
        expect(majorDryRun).toContain('Next version: 1.0.0');

        repo.execDiggerCommand('tag --no-push');
        expect(repo.getTags()).toContain('v1.0.0');

        // Generate changelog and verify
        repo.execDiggerCommand('generate -o changelogs');
        expect(repo.fileExists('changelogs/1.0.0.md')).toBe(true);
        expect(repo.fileExists('changelogs/0.1.0.md')).toBe(true);

        // Verify no more changesets to release
        const finalCheck = repo.execDiggerCommand('tag --dry-run --force');
        expect(finalCheck).toContain('No changesets found - nothing to release');
      }),
    );

    it(
      'should correctly categorize changes by type',
      withRepo(async (repo) => {
        // Create changesets of different types
        repo.createChangeset('feat-1', 'minor', 'Add new feature for users');
        repo.createChangeset('fix-1', 'patch', 'Fix critical bug in payment');
        repo.createChangeset(
          'breaking-1',
          'major',
          'Remove deprecated API endpoints',
        );
        repo.createChangeset(
          'security-1',
          'patch',
          'Security update for user authentication',
        );

        repo.makeChangesAndCommit({}, 'Add various changesets');
        repo.createTag('v2.0.0', 'Major release with various changes');

        // Generate changelog
        repo.execDiggerCommand('generate -o changelogs');

        // Verify categorization
        const changelog = repo.readFile('changelogs/2.0.0.md');

        // Should contain proper category headers
        expect(changelog).toContain('### 🎉 Added'); // new feature
        expect(changelog).toContain('### 🐛 Fixed'); // bug fix
        expect(changelog).toContain('### 🗑️ Removed'); // remove deprecated endpoints
        expect(changelog).toContain('### 🔒 Security'); // security update

        // Should contain the actual change descriptions
        expect(changelog).toContain('Add new feature for users');
        expect(changelog).toContain('Fix critical bug in payment');
        expect(changelog).toContain('Remove deprecated API endpoints');
        expect(changelog).toContain('Security update for user authentication');
      }),
    );

    it(
      'should handle empty changesets gracefully',
      withRepo(async (repo) => {
        // Create a tag with no changesets
        repo.createTag('v1.0.0', 'Empty release');

        // Generate changelog
        repo.execDiggerCommand('generate -o changelogs');

        // Should still create files
        expect(repo.fileExists('changelogs/index.json')).toBe(true);
        expect(repo.fileExists('changelogs/1.0.0.md')).toBe(true);

        // Changelog should mention no changes
        const changelog = repo.readFile('changelogs/1.0.0.md');
        expect(changelog).toContain('No detailed changes recorded');
      }),
    );

    it(
      'should respect maxVersions option',
      withRepo(async (repo) => {
        // Create many versions (each changeset gets tagged immediately)
        for (let i = 1; i <= 5; i++) {
          repo.createChangeset(`change-${i}`, 'patch', `Change ${i}`);
          repo.makeChangesAndCommit({}, `Add change ${i}`);
          repo.createTag(`v0.0.${i}`, `Release v0.0.${i}`);
        }

        // Generate with max 3 versions
        repo.execDiggerCommand('generate -o changelogs --max-versions 3');

        const indexContent = JSON.parse(repo.readFile('changelogs/index.json'));

        expect(indexContent.versions.length).toBeLessThanOrEqual(3);

        // Should include the most recent versions (no upcoming version expected)
        expect(repo.fileExists('changelogs/0.0.5.md')).toBe(true);
        expect(repo.fileExists('changelogs/0.0.4.md')).toBe(true);
        expect(repo.fileExists('changelogs/0.0.3.md')).toBe(true);
      }),
    );
  });

  describe('Version Calculation and Tagging', () => {
    it(
      'should calculate correct semantic versions from changesets',
      withRepo(async (repo) => {
        // Start with some initial version
        repo.createTag('v1.0.0', 'Initial version');

        // Add patch changes
        repo.createChangeset('fix-1', 'patch', 'Fix minor issue');
        repo.createChangeset('fix-2', 'patch', 'Another small fix');
        repo.makeChangesAndCommit({}, 'Add patch fixes');

        // Test tag command (dry run)
        const tagOutput = repo.execDiggerCommand('tag --dry-run');
        expect(tagOutput).toContain('Next version: 1.0.1');
        expect(tagOutput).toContain('Would create tag: v1.0.1');

        // Actually create the tag (no push for tests)
        repo.execDiggerCommand('tag --no-push');

        // Verify tag was created
        const tags = repo.getTags();
        expect(tags).toContain('v1.0.1');
        expect(tags).toContain('v1.0.0');
      }),
    );

    it(
      'should prioritize major changes over minor and patch',
      withRepo(async (repo) => {
        repo.createTag('v1.0.0', 'Base version');

        // Add changes of different severities
        repo.createChangeset('patch-1', 'patch', 'Small fix');
        repo.createChangeset('minor-1', 'minor', 'New feature');
        repo.createChangeset('major-1', 'major', 'Breaking change');
        repo.makeChangesAndCommit({}, 'Add mixed changes');

        // Should calculate major version bump
        const tagOutput = repo.execDiggerCommand('tag --dry-run');
        expect(tagOutput).toContain('Next version: 2.0.0');
      }),
    );

    it(
      'should handle case with no changesets',
      withRepo(async (repo) => {
        // Try to tag with no changesets
        const tagOutput = repo.execDiggerCommand('tag --dry-run');
        expect(tagOutput).toContain('No changesets found - nothing to release');
      }),
    );
  });

  describe('Error Handling', () => {
    it(
      'should handle non-git repositories gracefully',
      withRepo(async (repo) => {
        // Remove .git directory to simulate non-git repo
        repo.execInRepo('rm -rf .git');

        // Should not crash but should warn about git issues
        expect(() => {
          repo.execDiggerCommand('generate --dry-run');
        }).not.toThrow();
      }),
    );

    it(
      'should fail on corrupted changeset files by default',
      withRepo(async (repo) => {
        // Create an invalid changeset file manually (can't use add command for this)
        const changesetDir = path.join(repo.getRepoPath(), '.changeset');
        fs.mkdirSync(changesetDir, { recursive: true });
        fs.writeFileSync(
          path.join(changesetDir, 'invalid.md'),
          'This is not a valid changeset',
        );

        repo.makeChangesAndCommit({}, 'Add invalid changeset');
        repo.createTag('v1.0.0', 'Test with invalid changeset');

        // Should fail by default on corrupted files
        expect(() => {
          repo.execDiggerCommand('generate -o changelogs');
        }).toThrow();
      }),
    );

    it(
      'should skip corrupted changeset files with --ignore-errors flag',
      withRepo(async (repo) => {
        // Create an invalid changeset file manually (can't use add command for this)
        const changesetDir = path.join(repo.getRepoPath(), '.changeset');
        fs.mkdirSync(changesetDir, { recursive: true });
        fs.writeFileSync(
          path.join(changesetDir, 'invalid.md'),
          'This is not a valid changeset',
        );

        repo.makeChangesAndCommit({}, 'Add invalid changeset');
        repo.createTag('v1.0.0', 'Test with invalid changeset');

        // Should work when ignoring errors
        expect(() => {
          repo.execDiggerCommand('generate -o changelogs --ignore-errors');
        }).not.toThrow();

        expect(repo.fileExists('changelogs/index.json')).toBe(true);
      }),
    );
  });

  describe('Version Command', () => {
    it(
      'should output current version with --output current',
      withRepo(async (repo) => {
        // Create a base version
        repo.createTag('v1.2.3', 'Base version');

        const output = repo.execDiggerCommand('version --output current');
        expect(output.trim()).toBe('1.2.3');
      }),
    );

    it(
      'should output upcoming version with --output upcoming when changes exist',
      withRepo(async (repo) => {
        repo.createTag('v1.0.0', 'Base version');

        // Add a minor change
        repo.createChangeset('feat-1', 'minor', 'Add new feature');
        repo.makeChangesAndCommit({}, 'Add changeset');

        const output = repo.execDiggerCommand('version --output upcoming');
        expect(output.trim()).toBe('1.1.0');
      }),
    );

    it(
      'should output "null" when no changes exist with --output upcoming',
      withRepo(async (repo) => {
        repo.createTag('v1.0.0', 'Base version');

        const output = repo.execDiggerCommand('version --output upcoming');
        expect(output.trim()).toBe('null');
      }),
    );

    it(
      'should output hasChanges status correctly',
      withRepo(async (repo) => {
        repo.createTag('v1.0.0', 'Base version');

        // No changes initially
        let output = repo.execDiggerCommand('version --output hasChanges');
        expect(output.trim()).toBe('false');

        // Add changes
        repo.createChangeset('fix-1', 'patch', 'Fix bug');
        repo.makeChangesAndCommit({}, 'Add changeset');

        output = repo.execDiggerCommand('version --output hasChanges');
        expect(output.trim()).toBe('true');

        // Tag the changeset to reset the hasChanges status
        repo.createTag('v1.0.1', 'Release v1.0.1');
        output = repo.execDiggerCommand('version --output hasChanges');
        expect(output.trim()).toBe('false');
      }),
    );

    it(
      'should output correct changeCount',
      withRepo(async (repo) => {
        repo.createTag('v1.0.0', 'Base version');

        // Initially no changes
        let output = repo.execDiggerCommand('version --output changeCount');
        expect(output.trim()).toBe('0');

        // Add multiple changesets
        repo.createChangeset('fix-1', 'patch', 'Fix bug 1');
        repo.createChangeset('feat-1', 'minor', 'Add feature 1');
        repo.createChangeset('fix-2', 'patch', 'Fix bug 2');
        repo.makeChangesAndCommit({}, 'Add changesets');

        output = repo.execDiggerCommand('version --output changeCount');
        expect(output.trim()).toBe('3');

        // Tag the changeset to reset the changeCount status
        repo.createTag('v1.0.1', 'Release v1.0.1');
        output = repo.execDiggerCommand('version --output changeCount');
        expect(output.trim()).toBe('0');
      }),
    );

    it(
      'should output status format correctly',
      withRepo(async (repo) => {
        repo.createTag('v1.0.0', 'Base version');

        repo.createChangeset('feat-1', 'minor', 'Add feature');
        repo.makeChangesAndCommit({}, 'Add changeset');

        const output = repo.execDiggerCommand('version --output status');

        // Parse the key=value format
        const statusPairs = output.trim().split(' ');
        const statusMap = statusPairs.reduce((acc, pair) => {
          const [key, value] = pair.split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

        expect(statusMap.current).toBe('1.0.0');
        expect(statusMap.upcoming).toBe('1.1.0');
        expect(statusMap.hasChanges).toBe('true');
        expect(statusMap.changeCount).toBe('1');
      }),
    );

    it(
      'should output JSON format correctly (default)',
      withRepo(async (repo) => {
        repo.createTag('v2.1.0', 'Base version');

        repo.createChangeset('major-1', 'major', 'Breaking change');
        repo.createChangeset('fix-1', 'patch', 'Fix issue');
        repo.makeChangesAndCommit({}, 'Add changesets');

        const output = repo.execDiggerCommand('version --output json');
        const jsonData = JSON.parse(output);

        expect(jsonData).toEqual({
          current: '2.1.0',
          upcoming: '3.0.0', // Major bump from 2.1.0
          hasChanges: true,
          changeCount: 2,
        });
      }),
    );

    it(
      'should use json as default output format',
      withRepo(async (repo) => {
        repo.createTag('v1.0.0', 'Base version');

        // Test that default behavior is JSON output (since we set 'json' as default)
        const output = repo.execDiggerCommand('version');
        const jsonData = JSON.parse(output);

        expect(jsonData).toHaveProperty('current');
        expect(jsonData).toHaveProperty('upcoming');
        expect(jsonData).toHaveProperty('hasChanges');
        expect(jsonData).toHaveProperty('changeCount');
      }),
    );

    it(
      'should handle version calculation with mixed change types',
      withRepo(async (repo) => {
        repo.createTag('v1.5.2', 'Base version');

        // Add mixed changes - major should take precedence
        repo.createChangeset('patch-1', 'patch', 'Fix small bug');
        repo.createChangeset('minor-1', 'minor', 'Add feature');
        repo.createChangeset('major-1', 'major', 'Breaking change');
        repo.makeChangesAndCommit({}, 'Add mixed changesets');

        const output = repo.execDiggerCommand('version --output upcoming');
        expect(output.trim()).toBe('2.0.0'); // Major bump resets minor/patch
      }),
    );

    it(
      'should handle repository with no tags (starting from 0.0.0)',
      withRepo(async (repo) => {
        // Don't create any tags - should start from 0.0.0

        // Add a changeset
        repo.createChangeset('feat-1', 'minor', 'Initial feature');
        repo.makeChangesAndCommit({}, 'Add initial changeset');

        const currentOutput = repo.execDiggerCommand('version --output current');
        expect(currentOutput.trim()).toBe('0.0.0');

        const upcomingOutput = repo.execDiggerCommand('version --output upcoming');
        expect(upcomingOutput.trim()).toBe('0.1.0');
      }),
    );

    it(
      'should reject invalid output format',
      withRepo(async (repo) => {
        expect(() => {
          repo.execDiggerCommand('version --output invalid');
        }).toThrow();

        expect(() => {
          repo.execDiggerCommand('version --output');
        }).toThrow();
      }),
    );

    it(
      'should handle complex version scenarios',
      withRepo(async (repo) => {
        // Create a history of versions
        repo.createTag('v0.1.0', 'Initial release');

        repo.createChangeset('major-1', 'major', 'Breaking change');
        repo.makeChangesAndCommit({}, 'Add major change');
        repo.createTag('v1.0.0', 'Major release');

        repo.createChangeset('minor-1', 'minor', 'New feature');
        repo.createChangeset('patch-1', 'patch', 'Bug fix');
        repo.makeChangesAndCommit({}, 'Add more changes');

        // Verify version calculation from latest tag
        const jsonOutput = repo.execDiggerCommand('version --output json');
        const data = JSON.parse(jsonOutput);

        expect(data.current).toBe('1.0.0');
        expect(data.upcoming).toBe('1.1.0'); // Minor takes precedence over patch
        expect(data.hasChanges).toBe(true);
        expect(data.changeCount).toBe(2);
      }),
    );

    it(
      'should handle pre-release versions correctly',
      withRepo(async (repo) => {
        // Create a pre-release tag
        repo.createTag('v1.0.0-beta.1', 'Beta release');

        repo.createChangeset('fix-1', 'patch', 'Fix beta issue');
        repo.makeChangesAndCommit({}, 'Add beta fix');

        const currentOutput = repo.execDiggerCommand('version --output current');
        expect(currentOutput.trim()).toBe('1.0.0-beta.1');

        // Upcoming version should bump the main versioning
        const upcomingOutput = repo.execDiggerCommand('version --output upcoming');
        expect(upcomingOutput.trim()).toBe('1.0.1');
      }),
    );
  });
});
