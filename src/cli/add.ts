import { Command } from 'commander';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export const addCommand = new Command('add')
  .description('Create a new changeset describing changes in this repository')
  .option('-t, --type <type>', 'Version bump type (major, minor, patch)')
  .option('-m, --message <message>', 'Change description')
  .action(async (options) => {
    try {
      console.log('📝 Creating a new changeset...\n');

      // Auto-create .changeset directory if it doesn't exist
      const changesetDir = '.changeset';
      if (!fs.existsSync(changesetDir)) {
        console.log('📁 Creating .changeset directory...');
        fs.mkdirSync(changesetDir);

        // Create helpful README
        const readmePath = path.join(changesetDir, 'README.md');
        const readme = `# Changesets

This directory contains changeset files that describe changes in this repository.

## Creating a changeset

To create a new changeset, run:

\`\`\`bash
npx changesets-digger add
\`\`\`

## Releasing

To create a release tag: \`npx changesets-digger tag\`
To generate changelog files: \`npx changesets-digger generate\`

Learn more: https://github.com/oberbeck/changesets-digger
`;
        fs.writeFileSync(readmePath, readme);
        console.log('📝 Created README.md with instructions\n');
      }

      // Auto-detect package name for display only
      const packageName = getPackageName();
      console.log(`📦 Package: ${packageName}\n`);

      let selectedBumpType: string;
      let description: string;

      // Check if running in non-interactive mode
      if (options.type && options.message) {
        // Non-interactive mode
        const validTypes = ['major', 'minor', 'patch'];
        selectedBumpType = options.type.toLowerCase();

        if (!validTypes.includes(selectedBumpType)) {
          console.error('❌ Invalid type. Must be one of: major, minor, patch');
          process.exit(1);
        }

        description = options.message;

        console.log(`🏷️  Type: ${selectedBumpType}`);
        console.log(`📝 Message: ${description}`);
      } else {
        // Interactive mode
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const bumpType = await askQuestion(
          rl,
          '📈 What type of change is this?\n' +
            '   1) patch - Bug fixes, minor improvements\n' +
            '   2) minor - New features, non-breaking changes\n' +
            '   3) major - Breaking changes\n' +
            'Choose (1-3): ',
        );

        const bumpTypeMap: Record<string, string> = {
          '1': 'patch',
          '2': 'minor',
          '3': 'major',
        };

        selectedBumpType = bumpTypeMap[bumpType.trim()];
        if (!selectedBumpType) {
          console.error('❌ Invalid selection. Please choose 1, 2, or 3.');
          rl.close();
          process.exit(1);
        }

        description = await askQuestion(
          rl,
          '\n💬 Please describe this change (will be used in changelog):\n',
        );

        if (!description.trim()) {
          console.error('❌ Description is required.');
          rl.close();
          process.exit(1);
        }

        rl.close();
      }

      // Generate changeset file
      const changesetId = generateChangesetId();
      const changesetPath = path.join('.changeset', `${changesetId}.md`);

      const changesetContent = `---
type: ${selectedBumpType}
---

${description.trim()}
`;

      fs.writeFileSync(changesetPath, changesetContent);

      console.log('\n✅ Changeset created successfully!');
      console.log(`📁 File: ${changesetPath}`);
      console.log(`🏷️  Type: ${selectedBumpType}`);
      console.log(`📝 Description: ${description.trim()}`);
      console.log('\n💡 Next steps:');
      console.log('   - Commit this changeset with your changes');
      console.log('   - Create a release: npx changesets-digger tag');
    } catch (error) {
      console.error('❌ Error creating changeset:', error);
      process.exit(1);
    }
  });

function getPackageName(): string {
  try {
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      if (packageJson.name) {
        return packageJson.name;
      }
    }
  } catch (error) {
    console.warn('Could not read package.json');
  }

  // Fallback to directory name
  return path.basename(process.cwd());
}

function generateChangesetId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(3).toString('hex');
  return `${timestamp}-${random}`;
}

function askQuestion(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}
