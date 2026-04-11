import { afterAll, describe, it } from 'bun:test';
import { existsSync } from 'node:fs';

import { generateFileTree } from '../../../scripts/common';
import { TBC_ROOT, TBC_ROOT_NEXT } from './test-helper';

describe('🧪 999 TBC-CLI Integration: Teardown', () => {

    it('should finalize the integration run', () => {
        // Just a placeholder to ensure the describe block runs
    });

    afterAll(() => {
        // Final visual report for Mojo
        if (existsSync(TBC_ROOT)) {
            console.log('\n🐵 Mojo Jojo!');
            console.log(generateFileTree(TBC_ROOT));
        }
        // Final visual report for Kong
        if (existsSync(TBC_ROOT_NEXT)) {
            console.log('\n🦍 Kong Zilla!');
            console.log(generateFileTree(TBC_ROOT_NEXT));
        }
        console.log('🧪 Suite Complete');
    });

});