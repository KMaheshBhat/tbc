#!/usr/bin/env bun

import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { bootstrap } from './bootstrap.js';

const { registry } = await bootstrap();

const program = new Command();

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

program
    .name('tbc')
    .description('Third Brain Companion CLI')
    .option('--verbose', 'Enable verbose logging')
    .option('--root <path>', 'Specify root directory for operations (defaults to current working directory)')
    .version(packageJson.version);

let cmdSys = new Command('sys')
    .description('System management commands');

let cmdSysInit = new Command('init')
    .description('Initialize a new Third Brain Companion directory')
    .option('--companion <name>', 'Name of the AI companion')
    .option('--prime <name>', 'Name of the prime user (group)')
    .option('--profile <type>', 'System profile (baseline|next)', 'baseline')
    .action(async (opts) => {
        const flowName = 'tbc-system:init-flow:nx';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const { companion, prime, profile } = opts;
        if (!companion || !prime) {
            console.error('Error: Both --companion and --prime flags are required');
            process.exit(1);
        }
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            companionName: companion,
            primeName: prime,
            profile: profile,
        };
        const flowParams = {
            registry: registry,
        };
        try {
            const flow = registry.createNode(flowName, flowConfig);
            await flow.run(flowParams);
        } catch (error) {
            handleError(`Error running ${flowName}`, error, isVerbose);
            process.exit(1);
        }
        return;
    });
cmdSys.addCommand(cmdSysInit);

let cmdSysUpgrade = new Command('upgrade')
    .description('Upgrade an existing Third Brain Companion directory')
    .action(async () => {
        const flowName = 'tbc-system:upgrade-flow:nx';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            root: root,
            verbose: isVerbose,
        };
        const flowParams = {
            registry: registry,
            opts: { verbose: isVerbose },
            app: 'TBC CLI',
            appVersion: packageJson.version,
        };
        try {
            const flow = registry.createNode(flowName, flowConfig);
            await flow.run(flowParams);
        } catch (error) {
            handleError(`Error running ${flowName}`, error, isVerbose);
            process.exit(1);
        }
        return;
    });
cmdSys.addCommand(cmdSysUpgrade);

let cmdSysValidate = new Command('validate')
    .description('Validate current directory to check if it is a valid Third Brain Companion directory')
    .action(async () => {
        const flowName = 'tbc-system:upgrade-flow:nx';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            resolveProtocol: true,
        };
        const flowParams = {
            registry: registry,
        };
        try {
            const flow = registry.createNode(flowName, flowConfig);
            await flow.run(flowParams);
        } catch (error) {
            handleError(`Error running ${flowName}`, error, isVerbose);
            process.exit(1);
        }
        return;
    });
cmdSys.addCommand(cmdSysValidate);

program.addCommand(cmdSys);

let cmdGen = new Command('gen')
    .description('Generate IDs')
    .option('-c, --count <number>', 'Number of IDs to generate', '1');

let cmdGenUuid = new Command('uuid')
    .description('Generate/mint IDs of UUID v7')
    .action(async (_opts, cmd) => {
        const flowName = 'tbc-system:generate-uuids-flow:nx';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const flowConfig = {
            count: parseInt(cmd.parent.opts().count, 10),
        };
        const flowParams = {
            registry: registry,
        };
        try {
            const flow = registry.createNode(flowName, flowConfig);
            await flow.run(flowParams);
        } catch (error) {
            handleError(`Error running ${flowName}`, error, isVerbose);
            process.exit(1);
        }
        return;
    });
cmdGen.addCommand(cmdGenUuid);

let cmdGenTsid = new Command('tsid')
    .description('Generate/mint IDs of timestamp')
    .action(async (_opts, cmd) => {
        const flowName = 'tbc-system:generate-tsids-flow:nx';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const flowConfig = {
            count: parseInt(cmd.parent.opts().count, 10),
        };
        const flowParams = {
            registry: registry,
        };
        try {
            const flow = registry.createNode(flowName, flowConfig);
            await flow.run(flowParams);
        } catch (error) {
            handleError(`Error running ${flowName}`, error, isVerbose);
            process.exit(1);
        }
        return;
    });
cmdGen.addCommand(cmdGenTsid);

program.addCommand(cmdGen);

let cmdDex = new Command('dex')
    .description('Manage inDEXes')
    .option('--root <path>', 'Root directory');

let cmdDexRebuild = new Command('rebuild')
    .description('Rebuild all inDEXes')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = opts.root || cliOpts.root;
            const refreshCoreFlow = registry.createNode('tbc-system:dex-rebuild-flow', {
                verbose: opts.verbose,
            });
            await refreshCoreFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during dex core:', error);
            process.exit(1);
        }
        return;
    });
cmdDex.addCommand(cmdDexRebuild);

program.addCommand(cmdDex);

let cmdMem = new Command('mem')
    .description('Memory operations');

let cmdMemRemember = new Command('remember')
    .description('Persist a thought, fact, or stub to memory')
    .argument('[content]', 'The content of the memory')
    .option('-t, --type <type>', 'Record type: note (default), goal, log, party, structure', 'note')
    .option('--title <title>', 'Explicit title for the record')
    .option('--tags <tags>', 'Comma-separated tags')
    .action(async (content, opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;

            const rememberFlow = registry.createNode('tbc-memory:remember-flow', {
                verbose: isVerbose,
                rootDirectory: root,
                content: content,
                type: opts.type,
                title: opts.title,
                tags: opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : [],
            });

            await rememberFlow.run({
                registry: registry,
            });
        } catch (error) {
            console.error('Error during memory synthesis:', error);
            process.exit(1);
        }
    });

cmdMem.addCommand(cmdMemRemember);

let cmdMemRecall = new Command('recall')
    .description('Recall memories or identity information')
    .argument('[query]', 'Search query (e.g., "companion", "prime", or a keyword)')
    .option('-t, --type <type>', 'Filter by record type (note, goal, log, party, structure)')
    .option('-l, --limit <number>', 'Limit the number of results', parseInt, 10)
    .action(async (query, opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;

            const recallFlow = registry.createNode('tbc-memory:recall-flow', {
                verbose: isVerbose,
                rootDirectory: root,
                query: query,
                type: opts.type,
                limit: opts.limit,
            });

            await recallFlow.run({
                registry: registry,
            });
        } catch (error) {
            console.error('Error during memory recall:', error);
            process.exit(1);
        }
    });

cmdMem.addCommand(cmdMemRecall);

program.addCommand(cmdMem);

let cmdAct = new Command('act')
    .description('Activity operations');

let cmdActStart = new Command('start')
    .description('Start a new activity or resume from backlog')
    .argument('[uuid]', 'Activity UUID (optional, generates new if not provided)')
    .action(async (uuid) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const actStartFlow = registry.createNode('tbc-activity:act-start-flow', {
                verbose: isVerbose,
                activityId: uuid,
            });
            await actStartFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during act start:', error);
            process.exit(1);
        }
        return;
    });
cmdAct.addCommand(cmdActStart);

let cmdActShow = new Command('show')
    .description('Show current and backlog activities')
    .action(async () => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const actShowFlow = registry.createNode('tbc-activity:act-show-flow', {
                verbose: isVerbose,
            });
            await actShowFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during act show:', error);
            process.exit(1);
        }
        return;
    });
cmdAct.addCommand(cmdActShow);

let cmdActPause = new Command('pause')
    .description('Move activity from current to backlog')
    .argument('<uuid>', 'Activity UUID')
    .action(async (uuid) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const actPauseFlow = registry.createNode('tbc-activity:act-pause-flow', {
                verbose: isVerbose,
                activityId: uuid,
            });
            await actPauseFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during act pause:', error);
            process.exit(1);
        }
        return;
    });
cmdAct.addCommand(cmdActPause);

let cmdActClose = new Command('close')
    .description('Close activity and assimilate logs to memory')
    .argument('<uuid>', 'Activity UUID')
    .action(async (uuid) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const actCloseFlow = registry.createNode('tbc-activity:act-close-flow', {
                verbose: isVerbose,
                activityId: uuid,
            });
            await actCloseFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during act close:', error);
            process.exit(1);
        }
        return;
    });
cmdAct.addCommand(cmdActClose);


program.addCommand(cmdAct);

let cmdInt = new Command('int')
    .description('Interface commands');

let cmdIntProbe = new Command('probe')
    .description('Probe the environment for TBC CLI and system information')
    .action(async () => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const opts = { verbose: isVerbose };
            const probeFlow = registry.createNode('tbc-interface:int-probe-flow', {
                verbose: isVerbose,
            });
            await probeFlow.run({
                registry: registry,
                opts: opts,
                root: root,
                app: 'TBC CLI',
                appVersion: packageJson.version,
            });
        } catch (error) {
            console.error('Error during probe:', error);
            process.exit(1);
        }
        return;
    });
cmdInt.addCommand(cmdIntProbe);

let cmdIntGeneric = new Command('generic')
    .description('Generate generic AI assistant interface configuration')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const agentIntegrateFlow = registry.createNode('tbc-interface:agent-integrate-flow', {
                root: root,
                verbose: isVerbose,
                agentType: 'generic',
            });
            await agentIntegrateFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during agent integration:', error);
            process.exit(1);
        }
        return;
    });
cmdInt.addCommand(cmdIntGeneric);

let cmdIntGeminiCli = new Command('gemini-cli')
    .description('Generate Gemini CLI interface configuration')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const agentIntegrateFlow = registry.createNode('tbc-interface:agent-integrate-flow', {
                root: root,
                verbose: isVerbose,
                agentType: 'gemini-cli',
            });
            await agentIntegrateFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during agent integration:', error);
            process.exit(1);
        }
        return;
    });
cmdInt.addCommand(cmdIntGeminiCli);

let cmdIntGoose = new Command('goose')
    .description('Generate Goose interface configuration')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const agentIntegrateFlow = registry.createNode('tbc-interface:agent-integrate-flow', {
                root: root,
                verbose: isVerbose,
                agentType: 'goose',
            });
            await agentIntegrateFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during agent integration:', error);
            process.exit(1);
        }
        return;
    });
cmdInt.addCommand(cmdIntGoose);

let cmdIntGitHubCopilot = new Command('github-copilot')
    .description('Generate GitHub Copilot interface configuration')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const agentIntegrateFlow = registry.createNode('tbc-interface:agent-integrate-flow', {
                root: root,
                verbose: isVerbose,
                agentType: 'github-copilot',
            });
            await agentIntegrateFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during agent integration:', error);
            process.exit(1);
        }
        return;
    });
cmdInt.addCommand(cmdIntGitHubCopilot);

let cmdIntKilocode = new Command('kilocode')
    .description('Generate Kilo Code interface configuration')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const agentIntegrateFlow = registry.createNode('tbc-interface:agent-integrate-flow', {
                root: root,
                verbose: isVerbose,
                agentType: 'kilocode',
            });
            await agentIntegrateFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during agent integration:', error);
            process.exit(1);
        }
        return;
    });
cmdInt.addCommand(cmdIntKilocode);

program.addCommand(cmdInt);

program.parse();