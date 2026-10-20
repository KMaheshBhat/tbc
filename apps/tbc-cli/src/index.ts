#!/usr/bin/env bun

import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };

import { createActCommand } from './commands/act.js';
import { createDexCommand } from './commands/dex.js';
import { createGenCommand } from './commands/gen.js';
import { createIntCommand } from './commands/int.js';
import { createMemCommand } from './commands/mem.js';
import { createSysCommand } from './commands/sys.js';

const program = new Command();

program
    .name('tbc')
    .description('Third Brain Companion CLI')
    .option('--verbose', 'Enable verbose logging')
    .option('--root <path>', 'Specify root directory for operations (defaults to current working directory)')
    .version(packageJson.version);

program.addCommand(createGenCommand(program));
program.addCommand(createSysCommand(program));
program.addCommand(createMemCommand(program));
program.addCommand(createActCommand(program));
program.addCommand(createIntCommand(program));
program.addCommand(createDexCommand(program));

program.parse();
