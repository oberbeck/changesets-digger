#!/usr/bin/env node

import { Command } from 'commander';
import { addCommand } from './add';
import { generateCommand } from './generate';
import { tagCommand } from './tag';

const program = new Command();

program
  .name('changesets-digger')
  .description('Git-native changelog generation from changeset history')
  .version('0.1.0');

// Add subcommands
program.addCommand(addCommand);
program.addCommand(generateCommand);
program.addCommand(tagCommand);

// Default behavior - show help
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
