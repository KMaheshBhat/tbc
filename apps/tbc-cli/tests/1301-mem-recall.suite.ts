import { describe, expect, test } from 'bun:test';
import { runMonorepoCommand, TBC_ROOT_NEXT, CLI_TARGET } from './test-helper';

describe('🦍 1301 LETS-GO: tbc mem recall (Kong/Next)', () => {

    test('should recall using the Hybrid SQLite storer', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'mem',
            'recall',
            '--root',
            TBC_ROOT_NEXT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Hybrid SQLite [storer,querier] active for mem_next');
        expect(output).toContain('Query source: tbc-record-sqlite:query-records');
        expect(output).toContain('Kong');
        expect(output).toContain('Zilla');
    });

    test('should support rapid keyword search via SQLite', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'mem',
            'recall',
            'giant',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Kong likes giant bananas');
        expect(output).not.toContain('Zilla');
    });
});