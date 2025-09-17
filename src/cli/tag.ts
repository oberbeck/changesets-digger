import { Command } from 'commander';
import { createAndPushTag, hasUncommittedChanges } from '../core/git-ops';
import { getUpcomingVersion } from '../core/version-calc';

export const tagCommand = new Command('tag')
  .description('Create a release tag based on current changesets')
  .option(
    '--dry-run',
    'Show what tag would be created without actually creating it',
  )
  .option('-f, --force', 'Force tag creation even with uncommitted changes')
  .option('--no-push', 'Create tag locally without pushing to remote')
  .option(
    '--remote <name>',
    'Remote name to push to (default: origin)',
    'origin',
  )
  .action(async (options) => {
    try {
      console.log('🏷️  Preparing to create release tag...\n');

      // Check for uncommitted changes
      if (!options.force && hasUncommittedChanges()) {
        console.error('❌ Working directory has uncommitted changes');
        console.error(
          '   Commit your changes first or use --force to override',
        );
        process.exit(1);
      }

      // Calculate next version from changesets
      console.log('📋 Calculating next version from changesets...');
      const upcomingVersion = await getUpcomingVersion();

      if (!upcomingVersion) {
        console.log('ℹ️  No changesets found - nothing to release');
        process.exit(0);
      }

      const { version } = upcomingVersion;
      console.log(`✅ Next version: ${version}`);
      console.log(
        `📝 Changes summary: ${upcomingVersion.changes.length} changes`,
      );

      // Show changes
      console.log('\n📋 Changes in this release:');
      upcomingVersion.changes.forEach((change) => {
        const emoji = getChangeEmoji(change.type);
        console.log(`   ${emoji} ${change.summary}`);
      });

      if (options.dryRun) {
        console.log(`\n🔍 DRY RUN - Would create tag: v${version}`);
        console.log('   Run without --dry-run to actually create the tag');
        return;
      }

      // Create the tag
      const shouldPush = options.push !== false; // Commander sets push to false when --no-push is used
      const remote = options.remote || 'origin';

      if (shouldPush) {
        console.log(
          `\n🏷️  Creating and pushing tag v${version} to ${remote}...`,
        );
      } else {
        console.log(`\n🏷️  Creating tag v${version} (no push)...`);
      }

      createAndPushTag(version, {
        push: shouldPush,
        remote: remote,
      });

      console.log('\n✅ Release tag created successfully!');
      if (shouldPush) {
        console.log(`🚀 Tag v${version} has been created and pushed`);
        console.log('\n💡 Next steps:');
        console.log('   - The tag will trigger your deployment workflow');
      } else {
        console.log(`📍 Tag v${version} created locally`);
        console.log('\n💡 Next steps:');
        console.log(`   - Push manually: git push ${remote} v${version}`);
      }
      console.log('   - Generate changelogs with: changesets-digger generate');
    } catch (error) {
      console.error('❌ Error creating tag:', error);
      process.exit(1);
    }
  });

function getChangeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    added: '🎉',
    changed: '✨',
    deprecated: '⚠️',
    removed: '🗑️',
    fixed: '🐛',
    security: '🔒',
  };
  return emojis[type] || '📝';
}
