import { Command } from 'commander';
import { initSystem, upgradeSystem, validateSystem } from '../services/sys.service.js';
import { formatMessages } from '../lib/message.js';

const handleError = (message: string, error: unknown, verbose: boolean, source = 'sys') => {
  const messages = [
    {
      level: 'error' as const,
      code: 'COMMAND-ERROR',
      source,
      message: error instanceof Error ? error.message : String(error),
      suggestion: 'Check the error details above.',
    },
  ];
  console.error(formatMessages(messages, verbose));
};

export function createSysCommand(rootProgram: Command) {
  const cmdSys = new Command('sys')
    .description('System management commands');

  cmdSys.addCommand(
    new Command('init')
      .description('Initialize a new Third Brain Companion directory')
      .option('--companion <name>', 'Name of the AI companion')
      .option('--prime <name>', 'Name of the prime user (group)')
      .option('--profile <type>', 'System profile (baseline|next)', 'baseline')
      .action(async (opts) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        if (!opts.companion || !opts.prime) {
          handleError('Error running ng sys init', 'Both --companion and --prime flags are required', isVerbose, 'sys:init');
          process.exit(1);
        }
        try {
          await initSystem({
            rootDirectory: cliOpts.root || process.cwd(),
            companionName: opts.companion,
            primeName: opts.prime,
            profile: opts.profile as 'baseline' | 'next',
            verbose: isVerbose,
            source: 'sys:init',
          });
        } catch (error) {
          handleError('Error running ng sys init', error, isVerbose, 'sys:init');
          process.exit(1);
        }
        return;
      })
  );

  cmdSys.addCommand(
    new Command('upgrade')
      .description('Upgrade an existing Third Brain Companion directory')
      .action(async () => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await upgradeSystem({
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
            source: 'sys:upgrade',
          });
        } catch (error) {
          handleError('Error running ng sys upgrade', error, isVerbose, 'sys:upgrade');
          process.exit(1);
        }
        return;
      })
  );

  cmdSys.addCommand(
    new Command('validate')
      .description('Validate current directory to check if it is a valid Third Brain Companion directory')
      .option('--verbose', 'Show detailed validation output')
      .action(async (opts) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose || !!opts.verbose;
        try {
          await validateSystem({
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
            source: 'sys:validate',
          });
        } catch (error) {
          handleError('Error running ng sys validate', error, isVerbose, 'sys:validate');
          process.exit(1);
        }
        return;
      })
  );

  return cmdSys;
}