import { TBCProtocol } from './types';

export const PROTOCOLS: Record<string, TBCProtocol> = {
    baseline: {
        sys: {
            collection: 'sys',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: {
                            eagerIndex: false,
                            post: { id: 'tbc-system:dex-rebuild-sys-flow', config: {} },
                        }
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
                rebuild: [{ id: 'tbc-system:dex-rebuild-sys-flow', config: {} }],
            },
        },
        skills: {
            collection: 'skills',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: {
                            eagerIndex: false,
                            post: { id: 'tbc-system:dex-rebuild-skills-flow', config: {} },
                        }
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
                rebuild: [{ id: 'tbc-system:dex-rebuild-skills-flow', config: {} }],
            },
        },
        mem: {
            collection: 'mem',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: { eagerIndex: true, dexCollection: 'dex' },
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
                rebuild: [{ id: 'tbc-record-fs:dex-rebuild', config: { collection: 'mem' } }],
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
                        config: {
                            eagerIndex: false,
                            post: { id: 'tbc-system:dex-rebuild-sys-flow', config: {} }
                        }
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
                rebuild: [{ id: 'tbc-system:dex-rebuild-sys-flow', config: {} }],
            },
        },
        skills: {
            collection: 'skills_next',
            on: {
                store: [
                    {
                        id: 'tbc-record-fs:store-records',
                        config: {
                            eagerIndex: false,
                            post: { id: 'tbc-system:dex-rebuild-skills-flow', config: {} }
                        }
                    }
                ],
                query: [{ id: 'tbc-record-fs:query-records' }],
                fetch: [{ id: 'tbc-record-fs:fetch-records' }],
                rebuild: [{ id: 'tbc-system:dex-rebuild-skills-flow', config: {} }],
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
                rebuild: [{ id: 'tbc-record-fs:dex-rebuild', config: { collection: 'mem_next' } }],
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