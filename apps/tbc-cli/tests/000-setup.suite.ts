import { beforeAll, describe, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

import { SANDBOX, TBC_ROOT, TBC_ROOT_NEXT } from './test-helper';

describe('🧪 TBC-CLI Integration: Setup', () => {

    beforeAll(() => {
        // 1. Ensure shared parent _test exists
        if (!existsSync(SANDBOX)) {
            mkdirSync(SANDBOX, { recursive: true });
        }

        // 2. Clean and Re-create Mojo Baseline (mojo/)
        if (existsSync(TBC_ROOT)) {
            rmSync(TBC_ROOT, { recursive: true, force: true });
        }
        mkdirSync(TBC_ROOT, { recursive: true });

        // 3. Clean and Re-create Kong Next (kong/)
        if (existsSync(TBC_ROOT_NEXT)) {
            rmSync(TBC_ROOT_NEXT, { recursive: true, force: true });
        }
        mkdirSync(TBC_ROOT_NEXT, { recursive: true });
    });

    it('should have a clean sandbox for Mojo and Kong', () => {
        console.log(`🐵 Mojo Baseline (Standard): ${TBC_ROOT}`);
        console.log(`🦍 Kong Next (SQLite):      ${TBC_ROOT_NEXT}`);
    });

});