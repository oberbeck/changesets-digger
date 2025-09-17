import * as fs from 'fs';
import * as semver from 'semver';
import { ChangeEntry, ChangelogEntry } from '../types';
import { Changeset, readChangesets } from './changeset-reader';
import {
  getAllVersionTags,
  getChangesetsAtTag,
  getLatestTaggedVersion,
  getTagDate,
} from './git-ops';

/**
 * Calculate the next version from current changesets
 */
export async function getUpcomingVersion(
  options: { ignoreErrors?: boolean } = {},
): Promise<ChangelogEntry | null> {
  try {
    const allChangesets = await readChangesets('.', {
      ignoreErrors: options.ignoreErrors,
    });

    if (allChangesets.length === 0) {
      return null;
    }

    // Get current version from git tags or package.json
    const currentVersion = getCurrentVersion();
    const latestTag = getLatestTaggedVersion();

    // Filter changesets to only include new ones since the last tag
    let newChangesets = allChangesets;

    if (latestTag && latestTag !== '0.0.0') {
      // Get changesets that existed at the latest tag
      const changesetsAtLatestTag = getChangesetsAtTag(latestTag, {
        ignoreErrors: options.ignoreErrors,
      });

      // Only include changesets that are NOT in the latest tag
      newChangesets = allChangesets.filter(
        (cs) => !changesetsAtLatestTag.some((tagCs) => tagCs.id === cs.id),
      );
    }

    if (newChangesets.length === 0) {
      return null;
    }

    // Find the highest bump level from NEW changesets only
    const highestBumpLevel = getHighestBumpLevel(newChangesets);

    if (highestBumpLevel === 'none') {
      return null;
    }

    // Calculate next version
    const nextVersion = semver.inc(currentVersion, highestBumpLevel);

    if (!nextVersion) {
      throw new Error(
        `Could not calculate next version from ${currentVersion} with bump ${highestBumpLevel}`,
      );
    }

    return {
      version: nextVersion,
      date: new Date().toISOString(),
      changes: newChangesets.map((cs) => ({
        type: categorizeChange(cs.summary),
        summary: cs.summary,
      })),
      isUpcoming: true,
    };
  } catch (error) {
    console.warn('Could not determine upcoming version:', error);
    return null;
  }
}

/**
 * Get changelog entry for a specific historical version
 */
export function getHistoricalVersion(
  version: string,
  options: { ignoreErrors?: boolean } = {},
): ChangelogEntry {
  // For historical versions, we need to find what changesets were "consumed"
  // by that specific tag. This is the changesets that existed at that tag
  // minus the changesets that existed at the previous tag.
  const changesetsAtTag = getChangesetsAtTag(version, {
    ignoreErrors: options.ignoreErrors,
  });
  const previousTag = getPreviousTag(version);
  const changesetsAtPreviousTag = previousTag
    ? getChangesetsAtTag(previousTag, { ignoreErrors: options.ignoreErrors })
    : [];

  // Find changesets that were new in this version
  const newChangesets = changesetsAtTag.filter(
    (cs) => !changesetsAtPreviousTag.some((prevCs) => prevCs.id === cs.id),
  );

  return {
    version,
    date: getTagDate(version),
    changes: newChangesets.map((cs) => ({
      type: categorizeChange(cs.summary),
      summary: cs.summary,
    })),
  };
}

/**
 * Get the previous version tag before the given version
 */
function getPreviousTag(version: string): string | null {
  try {
    const allTags = getAllVersionTags();
    const currentIndex = allTags.indexOf(version);

    if (currentIndex === -1 || currentIndex === allTags.length - 1) {
      return null; // No previous tag
    }

    return allTags[currentIndex + 1]; // Next in the list (older version)
  } catch {
    return null;
  }
}

/**
 * Categorize a change summary into a semantic type
 */
function categorizeChange(summary: string): ChangeEntry['type'] {
  const lower = summary.toLowerCase();

  if (
    lower.includes('add') ||
    lower.includes('new') ||
    lower.includes('feature')
  ) {
    return 'added';
  }
  if (
    lower.includes('fix') ||
    lower.includes('bug') ||
    lower.includes('resolve')
  ) {
    return 'fixed';
  }
  if (lower.includes('remove') || lower.includes('delete')) {
    return 'removed';
  }
  if (lower.includes('deprecat')) {
    return 'deprecated';
  }
  if (lower.includes('security') || lower.includes('vulnerabilit')) {
    return 'security';
  }

  return 'changed';
}

/**
 * Calculate what the next version would be without creating it
 */
export async function calculateNextVersion(): Promise<string | null> {
  const upcomingVersion = await getUpcomingVersion();
  return upcomingVersion?.version || null;
}

/**
 * Get current version from git tags or package.json
 */
function getCurrentVersion(): string {
  // Try git tags first (most reliable for our use case)
  const latestTag = getLatestTaggedVersion();
  if (latestTag && latestTag !== '0.0.0') {
    return latestTag;
  }

  // Fallback to package.json
  try {
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      if (packageJson.version && packageJson.version !== '0.0.0') {
        return packageJson.version;
      }
    }
  } catch (error) {
    console.warn('Could not read package.json version:', error);
  }

  // Final fallback
  return '0.0.0';
}

/**
 * Determine the highest bump level from all changesets
 */
function getHighestBumpLevel(
  changesets: Changeset[],
): 'major' | 'minor' | 'patch' | 'none' {
  let highestLevel: 'major' | 'minor' | 'patch' | 'none' = 'none';

  for (const changeset of changesets) {
    // Parse releases from changeset
    for (const release of changeset.releases) {
      // Update highest level based on release type
      if (release.type === 'major') {
        return 'major'; // Major is highest, no need to check further
      } else if (release.type === 'minor' && highestLevel !== 'minor') {
        highestLevel = 'minor';
      } else if (release.type === 'patch' && highestLevel === 'none') {
        highestLevel = 'patch';
      }
    }
  }

  return highestLevel;
}
