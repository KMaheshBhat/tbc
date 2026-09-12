import { Command } from 'commander';
import { probeInterface, generateInterface } from '../services/int.service.js';

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

export function createIntCommand(rootProgram: Command) {
  const cmdInt = new Command('int')
    .description('Interface commands');

  cmdInt.addCommand(
    new Command('probe')
      .description('Probe the environment for TBC CLI and system information')
      .action(async () => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await probeInterface({
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng int probe', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  const agentTypes = ['generic', 'gemini-cli', 'goose', 'github-copilot', 'kilocode', 'pi'] as const;
  for (const agentType of agentTypes) {
    cmdInt.addCommand(
      new Command(agentType)
        .description(`Generate ${agentType} interface configuration`)
        .action(async () => {
          const cliOpts = rootProgram.opts();
          const isVerbose = !!cliOpts.verbose;
          try {
            await generateInterface({
              rootDirectory: cliOpts.root || process.cwd(),
              agentType,
              verbose: isVerbose,
            });
          } catch (error) {
            handleError(`Error running ng int ${agentType}`, error, isVerbose);
            process.exit(1);
          }
          return;
        })
    );
  }

  return cmdInt;
}
