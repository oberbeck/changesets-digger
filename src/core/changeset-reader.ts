import * as fs from 'fs';
import * as path from 'path';

export interface Changeset {
  id: string;
  summary: string;
  releases: Array<{
    type: 'major' | 'minor' | 'patch';
  }>;
}

/**
 * Read all changesets from the .changeset directory
 */
export async function readChangesets(
  cwd: string = '.',
  options: { ignoreErrors?: boolean } = {},
): Promise<Changeset[]> {
  const changesetDir = path.join(cwd, '.changeset');

  if (!fs.existsSync(changesetDir)) {
    throw new Error('There is no .changeset directory in this project');
  }

  const files = fs
    .readdirSync(changesetDir)
    .filter((file) => file.endsWith('.md') && !file.includes('README'))
    .map((file) => path.join(changesetDir, file));

  const changesets: Changeset[] = [];

  for (const file of files) {
    try {
      const changeset = parseChangesetFile(file);
      if (changeset) {
        // Check if changeset is valid (has releases)
        if (changeset.releases.length === 0 && !options.ignoreErrors) {
          throw new Error(
            `Invalid changeset file ${file}: no valid release information found`,
          );
        }
        changesets.push(changeset);
      }
    } catch (error) {
      if (options.ignoreErrors) {
        console.warn(`⚠️  Skipping invalid changeset file ${file}: ${error}`);
      } else {
        throw new Error(`Invalid changeset file ${file}: ${error}`);
      }
    }
  }

  return changesets;
}

/**
 * Parse changeset content from string
 */
export function parseChangesetContent(content: string, id: string): Changeset {
  const lines = content.split('\n');

  // Find frontmatter boundaries
  const frontmatterStart = lines.findIndex((line) => line.trim() === '---');
  const frontmatterEnd = lines.findIndex(
    (line, idx) => idx > frontmatterStart && line.trim() === '---',
  );

  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    console.warn(`Invalid changeset format in ${id}: missing frontmatter`);
    return {
      id,
      summary: content.trim() || `Changes from ${id}`,
      releases: [],
    };
  }

  // Parse frontmatter for release info
  const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
  const releases: Array<{ type: 'major' | 'minor' | 'patch' }> = [];

  frontmatterLines.forEach((line) => {
    // Handle simplified format: type: patch
    const simpleTypeMatch = line.match(
      /^type\s*:\s*["']?(major|minor|patch)["']?/,
    );
    if (simpleTypeMatch) {
      releases.push({
        type: simpleTypeMatch[1] as 'major' | 'minor' | 'patch',
      });
    }
  });

  // Extract summary (content after frontmatter)
  const summaryLines = lines.slice(frontmatterEnd + 1);
  const summary = summaryLines.join('\n').trim() || `Changes from ${id}`;

  return {
    id,
    summary,
    releases,
  };
}

/**
 * Parse a single changeset markdown file
 */
function parseChangesetFile(filePath: string): Changeset | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.md');

  return parseChangesetContent(content, filename);
}

/**
 * Check if changesets directory exists
 */
export function hasChangesets(cwd: string = '.'): boolean {
  const changesetDir = path.join(cwd, '.changeset');
  return fs.existsSync(changesetDir);
}

/**
 * Get the number of existing changesets
 */
export async function getChangesetCount(cwd: string = '.'): Promise<number> {
  try {
    const changesets = await readChangesets(cwd);
    return changesets.length;
  } catch {
    return 0;
  }
}
