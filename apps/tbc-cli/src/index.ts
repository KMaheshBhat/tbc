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

let cmdGen = new Command('gen')
    .description('Generate IDs')
    .option('-c, --count <number>', 'Number of IDs to generate', '1');

let cmdGenUuid = new Command('uuid')
    .description('Generate/mint IDs of UUID v7')
    .action(async (_opts, cmd) => {
        const flowName = 'tbc-system:generate-uuids-flow';
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
        const flowName = 'tbc-system:generate-tsids-flow';
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

let cmdSys = new Command('sys')
    .description('System management commands');

let cmdSysInit = new Command('init')
    .description('Initialize a new Third Brain Companion directory')
    .option('--companion <name>', 'Name of the AI companion')
    .option('--prime <name>', 'Name of the prime user (group)')
    .option('--profile <type>', 'System profile (baseline|next)', 'baseline')
    .action(async (opts) => {
        // Use nx flows
        const flowName = 'tbc-system:init-flow';
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
        // Use nx flows
        const flowName = 'tbc-system:upgrade-flow';
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
        // Use nx flows
        const flowName = 'tbc-system:validate-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            resolve: {
                resolveRootDirectory: true,
                resolveProtocol: true,
            },
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

let cmdMem = new Command('mem')
    .description('Memory operations');

let cmdMemRemember = new Command('remember')
    .description('Persist a thought, fact, or stub to memory')
    .argument('[content]', 'The content of the memory')
    .option('-t, --type <type>', 'Record type: note (default), goal, log, party, structure', 'note')
    .option('--title <title>', 'Explicit title for the record')
    .option('--tags <tags>', 'Comma-separated tags')
    .action(async (content, opts) => {
        const flowName = 'tbc-memory:remember-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const { type, title, tags } = opts;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            content: content,
            type: type,
            title: title,
            tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
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

cmdMem.addCommand(cmdMemRemember);

let cmdMemRecall = new Command('recall')
    .description('Recall memories or identity information')
    .argument('[query]', 'Search query (e.g., "companion", "prime", or a keyword)')
    .option('-t, --type <type>', 'Filter by record type (note, goal, log, party, structure)')
    .option('-l, --limit <number>', 'Limit the number of results', parseInt, 10)
    .action(async (query, opts) => {
        const flowName = 'tbc-memory:recall-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const { type, limit } = opts;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            query: query,
            type: type,
            limit: limit,
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

cmdMem.addCommand(cmdMemRecall);

program.addCommand(cmdMem);

let cmdAct = new Command('act')
    .description('Activity operations');

let cmdActStart = new Command('start')
    .description('Start a new activity or resume from backlog')
    .argument('[uuid]', 'Activity UUID (optional, generates new if not provided)')
    .action(async (uuid) => {
        const flowName = 'tbc-activity:act-start-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            activityId: uuid,
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
cmdAct.addCommand(cmdActStart);

let cmdActShow = new Command('show')
    .description('Show current and backlog activities')
    .action(async () => {
        const flowName = 'tbc-activity:act-show-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
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
cmdAct.addCommand(cmdActShow);

let cmdActPause = new Command('pause')
    .description('Move activity from current to backlog')
    .argument('<uuid>', 'Activity UUID')
    .action(async (uuid) => {
        const flowName = 'tbc-activity:act-pause-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            activityId: uuid,
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
cmdAct.addCommand(cmdActPause);

let cmdActClose = new Command('close')
    .description('Close activity and assimilate logs to memory')
    .argument('<uuid>', 'Activity UUID')
    .action(async (uuid) => {
        const flowName = 'tbc-activity:act-close-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            activityId: uuid,
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
cmdAct.addCommand(cmdActClose);

program.addCommand(cmdAct);

let cmdInt = new Command('int')
    .description('Interface commands');

let cmdIntProbe = new Command('probe')
    .description('Probe the environment for TBC CLI and system information')
    .action(async () => {
        const flowName = 'tbc-interface:int-probe-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
        };
        const flowParams = {
            registry: registry,
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
cmdInt.addCommand(cmdIntProbe);

let cmdIntGeneric = new Command('generic')
    .description('Generate generic AI assistant interface configuration')
    .action(async () => {
        const flowName = 'tbc-interface:agent-integrate-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            agentType: 'generic',
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
cmdInt.addCommand(cmdIntGeneric);

let cmdIntGeminiCli = new Command('gemini-cli')
    .description('Generate Gemini CLI interface configuration')
    .action(async () => {
        const flowName = 'tbc-interface:agent-integrate-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            agentType: 'gemini-cli',
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
cmdInt.addCommand(cmdIntGeminiCli);

let cmdIntGoose = new Command('goose')
    .description('Generate Goose interface configuration')
    .action(async () => {
        const flowName = 'tbc-interface:agent-integrate-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            agentType: 'goose',
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
cmdInt.addCommand(cmdIntGoose);

let cmdIntGitHubCopilot = new Command('github-copilot')
    .description('Generate GitHub Copilot interface configuration')
    .action(async () => {
        const flowName = 'tbc-interface:agent-integrate-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            agentType: 'github-copilot',
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
cmdInt.addCommand(cmdIntGitHubCopilot);

let cmdIntKilocode = new Command('kilocode')
    .description('Generate Kilo Code interface configuration')
    .action(async () => {
        const flowName = 'tbc-interface:agent-integrate-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
            agentType: 'kilocode',
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
cmdInt.addCommand(cmdIntKilocode);

program.addCommand(cmdInt);

let cmdDex = new Command('dex')
    .description('Manage inDEXes')
    .option('--root <path>', 'Root directory');

let cmdDexRebuild = new Command('rebuild')
    .description('Rebuild all inDEXes')
    .action(async (opts) => {
        const flowName = 'tbc-system:dex-rebuild-flow';
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const flowConfig = {
            verbose: isVerbose,
            rootDirectory: root,
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
cmdDex.addCommand(cmdDexRebuild);

program.addCommand(cmdDex);


program.parse();