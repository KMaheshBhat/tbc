import { Command } from 'commander';
import { startActivity, showActivity, pauseActivity, closeActivity } from '../services/act.service.js';

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

export function createActCommand(rootProgram: Command) {
  const cmdAct = new Command('act')
    .description('Activity operations');

  cmdAct.addCommand(
    new Command('start')
      .description('Start a new activity or resume from backlog')
      .argument('[uuid]', 'Activity UUID (optional, generates new if not provided)')
      .action(async (uuid) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await startActivity({
            rootDirectory: cliOpts.root || process.cwd(),
            activityId: uuid,
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng act start', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  cmdAct.addCommand(
    new Command('show')
      .description('Show current and backlog activities')
      .action(async () => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await showActivity({
            rootDirectory: cliOpts.root || process.cwd(),
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng act show', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  cmdAct.addCommand(
    new Command('pause')
      .description('Move activity from current to backlog')
      .argument('<uuid>', 'Activity UUID')
      .action(async (uuid) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await pauseActivity({
            rootDirectory: cliOpts.root || process.cwd(),
            activityId: uuid,
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng act pause', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  cmdAct.addCommand(
    new Command('close')
      .description('Close activity and assimilate logs to memory')
      .argument('<uuid>', 'Activity UUID')
      .action(async (uuid) => {
        const cliOpts = rootProgram.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await closeActivity({
            rootDirectory: cliOpts.root || process.cwd(),
            activityId: uuid,
            verbose: isVerbose,
          });
        } catch (error) {
          handleError('Error running ng act close', error, isVerbose);
          process.exit(1);
        }
        return;
      })
  );

  return cmdAct;
}
