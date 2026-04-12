import { beforeAll, describe, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

import { SANDBOX, TBC_ROOT, TBC_ROOT_NEXT } from './test-helper';

describe('🧪 0000 TBC-CLI Integration: Setup', () => {

    beforeAll(() => {
        if (!existsSync(SANDBOX)) {
            mkdirSync(SANDBOX, { recursive: true });
        }
        if (existsSync(TBC_ROOT)) {
            rmSync(TBC_ROOT, { recursive: true, force: true });
        }
        mkdirSync(TBC_ROOT, { recursive: true });
        if (existsSync(TBC_ROOT_NEXT)) {
            rmSync(TBC_ROOT_NEXT, { recursive: true, force: true });
        }
        mkdirSync(TBC_ROOT_NEXT, { recursive: true });
    });

    it('should have a clean sandbox for Mojo and Kong', () => {
        console.log(`🐵 Mojo Baseline: ${TBC_ROOT}`);
        console.log(`🦍 Kong Next    : ${TBC_ROOT_NEXT}`);
    });

});