import { Command } from 'commander';
import { rebuildDex } from '../services/dex.service.js';

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

export function createDexCommand(rootProgram: Command) {
  const cmdDex = new Command('dex')
    .description('Manage inDEXes')
    .option('--root <path>', 'Root directory');

  cmdDex.addCommand(
    new Command('rebuild')
      .description('Rebuild all inDEXes')
      .action(async () => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await rebuildDex({
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng dex rebuild', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  return cmdDex;
}
