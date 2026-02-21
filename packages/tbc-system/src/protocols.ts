import { TBCProtocol } from './types';

export const PROTOCOLS: Record<string, TBCProtocol> = {
    baseline: {
        sys: {
            collection: 'sys',
            recordStorers: ['tbc-record-fs:store-records'],
        },
        skills: {
            collection: 'skills',
            recordStorers: ['tbc-record-fs:store-records'],
        },
        mem: {
            collection: 'mem',
            recordStorers: ['tbc-record-fs:store-records'],
        },
        dex: {
            collection: 'dex',
            recordStorers: ['tbc-record-fs:store-records'],
        },
        act: {
            collection: 'act',
            recordStorers: ['tbc-record-fs:store-records'],
        },
    },
    next: {
        sys: {
            collection: 'sys_next',
            recordStorers: ['tbc-record-fs:store-records'],
        },
        skills: {
            collection: 'skills_next',
            recordStorers: ['tbc-record-fs:store-records'],
        },
        mem: {
            collection: 'mem_next',
            recordStorers: [
                'tbc-record-fs:store-records',
                // 'tbc-record-sqlite:store-records',
            ],
        },
        dex: {
            collection: 'dex_next',
            recordStorers: ['tbc-record-fs:store-records'],
        },
        act: {
            collection: 'act_next',
            recordStorers: ['tbc-record-fs:store-records'],
        },
    },
}