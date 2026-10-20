import { Command } from 'commander';
import { GenRequest, generateUuids, generateTsids } from '../services/gen.service.js';

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
          const count = parseInt(cmd.parent.opts().count, 10);
          if (Number.isNaN(count)) {
            throw new Error(`Invalid count: "${cmd.parent.opts().count}" is not a number`);
          }
          const request: GenRequest = {
            count,
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
            source: 'gen:uuid',
          };
          await generateUuids(request); // service logs formatted output internally
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
          const count = parseInt(cmd.parent.opts().count, 10);
          if (Number.isNaN(count)) {
            throw new Error(`Invalid count: "${cmd.parent.opts().count}" is not a number`);
          }
          const request: GenRequest = {
            count,
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
            source: 'gen:tsid',
          };
          await generateTsids(request); // service logs formatted output internally
        } catch (error) {
          handleError('Error running ng gen tsid', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  return cmdGen;
}
