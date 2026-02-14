import { beforeAll, describe } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

import { SANDBOX, TBC_ROOT } from './test-helper';

describe('🐵 TBC-CLI Integration', () => {

    beforeAll(() => {
        if (!existsSync(SANDBOX)) mkdirSync(SANDBOX, { recursive: true });
        if (existsSync(TBC_ROOT)) {
            rmSync(TBC_ROOT, { recursive: true, force: true });
        }
        mkdirSync(TBC_ROOT, { recursive: true });
        console.log('🐵 Suite Setup Complete: TBC_ROOT is ready');
    });

});
