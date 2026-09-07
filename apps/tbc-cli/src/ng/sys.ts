import { Command } from 'commander';
import { initSystem, upgradeSystem, validateSystem } from '../services/sys.service.js';

const handleError = (message: string, error: unknown, verbose: boolean) => {
    if (error instanceof Error) {
        console.error(`${message}: ${error.message}`);
        error.cause && console.error(error.cause);
        verbose && console.error(error);
    } else {
        console.error(message);
        console.error(error);
    }
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
        try {
          await initSystem({
            rootDirectory: cliOpts.root || process.cwd(),
            companionName: opts.companion,
            primeName: opts.prime,
            profile: opts.profile as 'baseline' | 'next',
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng sys init', error, isVerbose);
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
          await upgradeSystem(cliOpts.root || process.cwd(), isVerbose);
        } catch (error) {
          handleError('Error running ng sys upgrade', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  cmdSys.addCommand(
    new Command('validate')
      .description('Validate current directory to check if it is a valid Third Brain Companion directory')
      .action(async () => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          const result = await validateSystem(cliOpts.root || process.cwd(), isVerbose);
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          handleError('Error running ng sys validate', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  return cmdSys;
}
