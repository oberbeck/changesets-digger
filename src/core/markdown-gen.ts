import * as fs from 'fs';
import * as path from 'path';
import { ChangelogEntry, ChangelogIndex, DiggerConfig } from '../types';

const defaultCategoryTitles = {
  added: '### 🎉 Added',
  changed: '### ✨ Changed',
  deprecated: '### ⚠️ Deprecated',
  removed: '### 🗑️ Removed',
  fixed: '### 🐛 Fixed',
  security: '### 🔒 Security',
};

/**
 * Generate all changelog files from version entries
 */
export function generateChangelogs(
  versions: ChangelogEntry[],
  config: DiggerConfig = {},
): void {
  const outputDir = config.outputDir || 'src/assets/changelogs';
  const categoryTitles = { ...defaultCategoryTitles, ...config.categoryTitles };

  // Clean and recreate output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Generate index file
  const index: ChangelogIndex = {
    versions: versions.map((v) => ({
      version: v.version,
      date: v.date,
      fileUrl: `${v.version}.md`,
      summary: v.isUpcoming
        ? `Release ${v.version} (Preview)`
        : `Release ${v.version}`,
    })),
    latestVersion: versions[0]?.version || '0.0.0',
  };

  // Write individual markdown files
  versions.forEach((entry) => {
    const markdown = generateVersionMarkdown(entry, categoryTitles);
    const filePath = path.join(outputDir, `${entry.version}.md`);
    fs.writeFileSync(filePath, markdown);
  });

  // Write index file
  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log(
    `✅ Generated changelogs for ${versions.length} versions in ${outputDir}`,
  );
}

/**
 * Generate markdown content for a single version
 */
function generateVersionMarkdown(
  entry: ChangelogEntry,
  categoryTitles: Record<string, string>,
): string {
  let markdown = `# What's New in ${entry.version}\n\n`;

  if (entry.isUpcoming) {
    markdown += `*Preview of upcoming release*\n\n`;
  } else {
    markdown += `*Released on ${new Date(entry.date).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    )}*\n\n`;
  }

  if (entry.changes.length === 0) {
    markdown += '*No detailed changes recorded for this version.*\n\n';
    return markdown;
  }

  // Group changes by category
  const categorized = entry.changes.reduce(
    (acc, change) => {
      if (!acc[change.type]) acc[change.type] = [];
      acc[change.type].push(change.summary);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  // Output each category
  Object.entries(categorized).forEach(([type, summaries]) => {
    const title =
      categoryTitles[type] ||
      `### ${type.charAt(0).toUpperCase()}${type.slice(1)}`;

    markdown += `${title}\n\n`;
    summaries.forEach((summary) => {
      markdown += `- ${summary}\n`;
    });
    markdown += '\n';
  });

  return markdown;
}

/**
 * Generate a simple text summary of changes
 */
export function generateSummary(entry: ChangelogEntry): string {
  const changeCount = entry.changes.length;
  if (changeCount === 0) {
    return `Release ${entry.version} - No changes recorded`;
  }

  const types = [...new Set(entry.changes.map((c) => c.type))];
  const typeString = types.join(', ');

  return `Release ${entry.version} - ${changeCount} change${
    changeCount > 1 ? 's' : ''
  } (${typeString})`;
}
