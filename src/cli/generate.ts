import { Command } from 'commander';
import * as fs from 'fs';
import { getAllVersionTags } from '../core/git-ops';
import { generateChangelogs, generateSummary } from '../core/markdown-gen';
import { getHistoricalVersion, getUpcomingVersion } from '../core/version-calc';
import { ChangelogEntry, DiggerConfig } from '../types';

export const generateCommand = new Command('generate')
  .alias('gen')
  .description('Generate changelogs from git history and current changesets')
  .option(
    '-o, --output <dir>',
    'Output directory for changelog files',
    'src/assets/changelogs',
  )
  .option(
    '-m, --max-versions <number>',
    'Maximum number of historical versions to include',
    '10',
  )
  .option('-c, --config <file>', 'Path to configuration file')
  .option('--dry-run', 'Show what would be generated without writing files')
  .option(
    '--ignore-errors',
    'Continue generation even if changeset files are corrupted',
  )
  .action(async (options) => {
    try {
      console.log('🔍 Generating changelogs from git history...\n');

      // Load configuration
      const config: DiggerConfig = await loadConfig(options);

      const allVersions: ChangelogEntry[] = [];

      // 1. Add upcoming version from current changesets
      console.log(
        '📋 Checking for upcoming version from current changesets...',
      );
      const upcomingVersion = await getUpcomingVersion({
        ignoreErrors: options.ignoreErrors,
      });
      if (upcomingVersion) {
        allVersions.push(upcomingVersion);
        console.log(
          `✅ Found upcoming version: ${upcomingVersion.version} (${upcomingVersion.changes.length} changes)`,
        );
      } else {
        console.log('ℹ️  No pending changesets found');
      }

      // 2. Add historical versions from git tags
      console.log('\n🏷️  Reading historical versions from git tags...');
      const maxVersions = parseInt(options.maxVersions) || 10;
      const maxHistoricalVersions = upcomingVersion
        ? maxVersions - 1
        : maxVersions;
      const historicalVersions = getAllVersionTags().slice(
        0,
        maxHistoricalVersions,
      );

      if (historicalVersions.length === 0) {
        console.log('⚠️  No version tags found in git history');
      } else {
        console.log(
          `📖 Processing ${historicalVersions.length} historical versions...`,
        );

        for (const version of historicalVersions) {
          console.log(`   Processing v${version}...`);
          const entry = getHistoricalVersion(version, {
            ignoreErrors: options.ignoreErrors,
          });
          allVersions.push(entry);
        }
      }

      // 3. Generate output
      if (allVersions.length === 0) {
        console.log('\n⚠️  No versions found to generate changelogs for');
        return;
      }

      console.log(
        `\n📝 Generating changelog files for ${allVersions.length} versions...`,
      );

      if (options.dryRun) {
        console.log('\n🔍 DRY RUN - Files that would be generated:');
        allVersions.forEach((v) => {
          const summary = generateSummary(v);
          console.log(`   ${config.outputDir}/${v.version}.md - ${summary}`);
        });
        console.log(`   ${config.outputDir}/index.json - Version index`);
      } else {
        generateChangelogs(allVersions, config);
        console.log('\n✅ Changelog generation completed successfully!');
        console.log(`📁 Files written to: ${config.outputDir}`);
      }
    } catch (error) {
      console.error('❌ Error generating changelogs:', error);
      process.exit(1);
    }
  });

async function loadConfig(options: any): Promise<DiggerConfig> {
  const config: DiggerConfig = {
    outputDir: options.output,
    maxVersions: parseInt(options.maxVersions) || 10,
  };

  // Load from config file if specified
  if (options.config && fs.existsSync(options.config)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(options.config, 'utf-8'));
      Object.assign(config, fileConfig);
      console.log(`📄 Loaded configuration from ${options.config}`);
    } catch (error) {
      console.warn(`⚠️  Could not load config file: ${error}`);
    }
  }

  // Auto-detect package name for display
  try {
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      if (packageJson.name) {
        console.log(`📦 Auto-detected package name: ${packageJson.name}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not auto-detect package name from package.json');
  }

  return config;
}
