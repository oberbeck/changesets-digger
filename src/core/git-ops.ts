import { execSync } from 'child_process';
import { ChangesetData } from '../types';
import { parseChangesetContent } from './changeset-reader';

/**
 * Get all semantic version tags, sorted by version (newest first)
 */
export function getAllVersionTags(): string[] {
  try {
    return execSync('git tag -l --sort=-version:refname')
      .toString()
      .trim()
      .split('\n')
      .filter((tag) => tag.match(/^v?\d+\.\d+\.\d+$/))
      .map((tag) => tag.replace(/^v/, ''));
  } catch (error) {
    console.warn('Could not fetch git tags:', error);
    return [];
  }
}

/**
 * Get the current tagged version (if HEAD points to a tag)
 */
export function getCurrentTaggedVersion(): string | null {
  try {
    const tag = execSync('git tag --points-at HEAD').toString().trim();
    return tag ? tag.replace(/^v/, '') : null;
  } catch {
    return null;
  }
}

/**
 * Get the latest tagged version
 */
export function getLatestTaggedVersion(): string {
  try {
    const tag = execSync(
      'git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"',
    )
      .toString()
      .trim()
      .replace(/^v/, '');
    return tag;
  } catch {
    return '0.0.0';
  }
}

/**
 * Get the date when a tag was created
 */
export function getTagDate(version: string): string {
  try {
    return execSync(`git log -1 --format=%aI v${version}`).toString().trim();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Get all changeset files that existed at a specific tag
 */
export function getChangesetFilesAtTag(tagName: string): string[] {
  try {
    const files = execSync(`git ls-tree -r --name-only v${tagName} .changeset/`)
      .toString()
      .trim()
      .split('\n')
      .filter((file) => file.endsWith('.md') && !file.includes('README'));

    return files;
  } catch (error) {
    console.warn(`Could not get changeset files for tag v${tagName}:`, error);
    return [];
  }
}

/**
 * Read the content of a file at a specific tag
 */
export function getFileContentAtTag(
  tagName: string,
  filePath: string,
): string | null {
  try {
    return execSync(`git show v${tagName}:${filePath}`).toString();
  } catch (error) {
    console.warn(`Could not read file ${filePath} at tag v${tagName}`);
    return null;
  }
}

/**
 * Get changesets that existed at a specific tag
 */
export function getChangesetsAtTag(
  tagName: string,
  options: { ignoreErrors?: boolean } = {},
): ChangesetData[] {
  const changesetFiles = getChangesetFilesAtTag(tagName);

  const results: ChangesetData[] = [];

  for (const file of changesetFiles) {
    try {
      const content = getFileContentAtTag(tagName, file);
      if (!content) {
        if (options.ignoreErrors) {
          console.warn(
            `⚠️  Could not read changeset ${file} at tag v${tagName}, skipping`,
          );
          continue;
        } else {
          throw new Error(
            `Could not read changeset file ${file} at tag v${tagName}`,
          );
        }
      }

      const changeset = parseChangesetContent(
        content,
        file.replace('.changeset/', '').replace('.md', ''),
      );

      // Check if changeset is valid
      if (changeset.releases.length === 0 && !options.ignoreErrors) {
        throw new Error(
          `Invalid changeset file ${file} at tag v${tagName}: no valid release information found`,
        );
      }

      if (changeset.releases.length > 0) {
        results.push(changeset);
      }
    } catch (error) {
      if (options.ignoreErrors) {
        console.warn(
          `⚠️  Skipping invalid changeset ${file} at tag v${tagName}: ${error}`,
        );
      } else {
        throw error;
      }
    }
  }

  return results;
}

/**
 * Create a git tag and optionally push it
 */
export function createAndPushTag(
  version: string,
  options: { push?: boolean; remote?: string } = {},
): void {
  const tagName = `v${version}`;
  const { push = true, remote = 'origin' } = options;

  try {
    execSync(`git tag ${tagName}`);
    console.log(`✅ Created tag ${tagName}`);

    if (push && hasRemote(remote)) {
      try {
        execSync(`git push ${remote} ${tagName}`, { stdio: 'pipe' });
        console.log(`🚀 Pushed tag ${tagName} to ${remote}`);
      } catch (pushError) {
        console.log(
          `⚠️  Could not push tag ${tagName} to ${remote}: ${pushError}`,
        );
        console.log(`ℹ️  Tag created locally only`);
      }
    } else if (push && !hasRemote(remote)) {
      console.log(
        `ℹ️  Tag ${tagName} created locally (no remote '${remote}' found)`,
      );
    } else {
      console.log(`ℹ️  Tag ${tagName} created locally (push disabled)`);
    }
  } catch (error) {
    throw new Error(`Failed to create tag ${tagName}: ${error}`);
  }
}

/**
 * Check if a git remote exists
 */
export function hasRemote(remoteName: string = 'origin'): boolean {
  try {
    execSync(`git remote get-url ${remoteName}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if working directory has uncommitted changes
 */
export function hasUncommittedChanges(): boolean {
  try {
    const status = execSync('git status --porcelain').toString().trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the current git commit hash (short version)
 */
export function getCurrentCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    console.warn('Could not get git commit hash:', error);
    return 'unknown';
  }
}
