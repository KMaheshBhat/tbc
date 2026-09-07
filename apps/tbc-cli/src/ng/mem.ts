import { Command } from 'commander';
import { rememberMemory, recallMemory, assimilateMemory } from '../services/mem.service.js';

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

export function createMemCommand(rootProgram: Command) {
  const cmdMem = new Command('mem')
    .description('Memory operations');

  cmdMem.addCommand(
    new Command('remember')
      .description('Persist a thought, fact, or stub to memory')
      .argument('[content]', 'The content of the memory')
      .option('-t, --type <type>', 'Record type: note (default), goal, log, party, structure', 'note')
      .option('--title <title>', 'Explicit title for the record')
      .option('--tags <tags>', 'Comma-separated tags')
      .action(async (content, opts) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await rememberMemory({
            rootDirectory: cliOpts.root || process.cwd(),
            content,
            type: opts.type,
            title: opts.title,
            tags: opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : [],
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng mem remember', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  cmdMem.addCommand(
    new Command('recall')
      .description('Recall memories or identity information')
      .argument('[query]', 'Search query (e.g., "companion", "prime", or a keyword)')
      .option('-t, --type <type>', 'Filter by record type (note, goal, log, party, structure)')
      .option('-l, --limit <number>', 'Limit the number of results', parseInt, 10)
      .action(async (query, opts) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await recallMemory({
            rootDirectory: cliOpts.root || process.cwd(),
            query,
            type: opts.type,
            limit: opts.limit,
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng mem recall', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  cmdMem.addCommand(
    new Command('assimilate')
      .description('Replicate memory records across all RecordStore providers')
      .action(async () => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await assimilateMemory({
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng mem assimilate', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  return cmdMem;
}
