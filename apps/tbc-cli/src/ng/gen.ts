import { Command } from 'commander';
import { GenServiceConfig, generateUuids, generateTsids } from '../services/gen.service.js';

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

export function createGenCommand(rootProgram: Command) {
  const cmdGen = new Command('gen')
    .description('Generate IDs')
    .option('-c, --count <number>', 'Number of IDs to generate', '1');

  cmdGen.addCommand(
    new Command('uuid')
      .description('Generate/mint IDs of UUID v7')
      .action(async (_opts, cmd) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          const config: GenServiceConfig = {
            count: parseInt(cmd.parent.opts().count, 10),
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
          };
          const ids = await generateUuids(config);
          for (const id of ids) {
            console.log(id);
          }
        } catch (error) {
          handleError('Error running ng gen uuid', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  cmdGen.addCommand(
    new Command('tsid')
      .description('Generate/mint IDs of timestamp')
      .action(async (_opts, cmd) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          const config: GenServiceConfig = {
            count: parseInt(cmd.parent.opts().count, 10),
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
          };
          const ids = await generateTsids(config);
          for (const id of ids) {
            console.log(id);
          }
        } catch (error) {
          handleError('Error running ng gen tsid', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  return cmdGen;
}
