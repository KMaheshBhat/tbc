import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runMonorepoCommand, querySqliteNext, TBC_ROOT_NEXT, CLI_TARGET, UUID_SEARCH_REGEX, expectSQLiteData } from './test-helper';

describe('🦍 LETS-GO: tbc mem remember (Kong/Next)', () => {

    test('should persist memory to both FS and SQLite', async () => {
        const thought = 'Kong likes giant bananas';
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'mem', 'remember', thought,
            '--root', TBC_ROOT_NEXT,
        ]);

        expect(success).toBe(true);
        const matches = output.match(UUID_SEARCH_REGEX);
        const mintedId = matches![matches!.length - 1];

        // 1. Physical Check (FS)
        const memFilePath = join(TBC_ROOT_NEXT, 'mem_next', `${mintedId}.md`);
        expect(existsSync(memFilePath)).toBe(true);

        // 2. Projection Check (SQLite)
        // Verify that the record exists in the DB and the title was correctly indexed
        expectSQLiteData(mintedId, 'record_title', thought);
        expectSQLiteData(mintedId, 'record_type', 'note');
    });

    test('should index tags into the SQLite relation table', async () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'mem', 'remember', 'Scaling the empire',
            '--tags', 'growth,zilla',
            '--root', TBC_ROOT_NEXT,
        ]);
        console.log(output)

        const matches = output.match(UUID_SEARCH_REGEX);
        const mintedId = matches![matches!.length - 1];

        // Verify tags are mirrored in SQLite relations (if your schema supports it)
        // Or simply verify the record's searchable metadata
        expectSQLiteData(mintedId, 'record_tags', (tags: string) => {
            return tags.includes('t/growth') && tags.includes('t/zilla');
        });
    });
});