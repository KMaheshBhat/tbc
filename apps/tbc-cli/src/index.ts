#!/usr/bin/env node

import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { bootstrap } from './bootstrap.js';

const { /* future: registry */ } = await bootstrap();

const program = new Command();

program
  .name('tbc')
  .description('Third Brain Companion CLI')
  .option('--verbose', 'Enable verbose logging')
  .version(packageJson.version);

let cmdInspect = new Command('inspect')
  .description('Inspect current directory to check if it is a valid TBC root')
  .action(async () => {
    const cwd = process.cwd();
    const verbose = !!program.opts().verbose;

    console.log(`Inspecting directory: ${cwd}`);
    console.log('');

    // Check for tbc/ directory
    const tbcDir = `${cwd}/tbc`;
    const tbcExists = (await import('fs')).existsSync(tbcDir);
    console.log(`tbc/ directory: ${tbcExists ? '✓ Found' : '✗ Missing'}`);

    // Check for vault/ directory
    const vaultDir = `${cwd}/vault`;
    const vaultExists = (await import('fs')).existsSync(vaultDir);
    console.log(`vault/ directory: ${vaultExists ? '✓ Found' : '✗ Missing'}`);

    // Check for dex/ directory (optional)
    const dexDir = `${cwd}/dex`;
    const dexExists = (await import('fs')).existsSync(dexDir);
    console.log(`dex/ directory: ${dexExists ? '✓ Found' : '○ Optional (will be created if missing)'}`);

    console.log('');

    const isValidRoot = tbcExists && vaultExists;
    if (isValidRoot) {
      console.log('✅ This appears to be a valid TBC root directory.');
      if (verbose) {
        console.log('');
        console.log('TBC Root Structure:');
        console.log('- tbc/     : TBC system files and specifications');
        console.log('- vault/   : Record storage');
        console.log('- dex/     : Generated indexes (optional)');
      }
    } else {
      console.log('❌ This does not appear to be a valid TBC root directory.');
      console.log('');
      console.log('To create a TBC root, you need:');
      console.log('- tbc/ directory with TBC system files');
      console.log('- vault/ directory for record storage');
      console.log('');
      console.log('Use "tbc init" to set up a new TBC companion (when implemented).');
    }

    if (verbose) {
      console.log('');
      console.log('For more information, see: https://github.com/KMaheshBhat/tbc');
    }
  });

program.addCommand(cmdInspect);

program.parse();