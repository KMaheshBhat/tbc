import { TBCProtocol } from './types';

export const PROTOCOLS: Record<string, TBCProtocol> = {
    baseline: {
        sys: {
            collection: 'sys',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: false },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
        skills: {
            collection: 'skills',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: false },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
        mem: {
            collection: 'mem',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: true },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
        dex: {
            collection: 'dex',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: false },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
        act: {
            collection: 'act',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: false },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
    },
    next: {
        sys: {
            collection: 'sys_next',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: false },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
        skills: {
            collection: 'skills_next',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: false },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
        mem: {
            collection: 'mem_next',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: true, dexCollection: 'dex_next' },
                    },
                    { id: 'tbc-record-sqlite:store-records' },
                ],
                query: [
                    { id: 'tbc-record-sqlite:query-records' },
                    { id: 'tbc-record-fs:query-records' },
                ],
                fetch: [
                    { id: 'tbc-record-sqlite:fetch-records' },
                    { id: 'tbc-record-fs:fetch-records' },
                ],
            },
        },
        dex: {
            collection: 'dex_next',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: false },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
        act: {
            collection: 'act_next',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: false },
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
            },
        },
    },
};