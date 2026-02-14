import { HAMINode } from '@hami-frameworx/core';

import type { Shared } from '../types.js';

type HealthSummaryQueryInput = {
  dexStore: any; // DexStore
};

type HealthSummaryQueryOutput = {
  healthSummary: {
    total_records: number;
    healthy_records: number;
    health_percentage: number;
  };
};

export class HealthSummaryQueryNode extends HAMINode<Shared> {
  constructor(maxRetries?: number, wait?: number) {
    super(maxRetries, wait);
  }

  kind(): string {
    return 'tbc-dex:health-summary-query';
  }

  async prep(shared: Shared): Promise<HealthSummaryQueryInput> {
    if (!shared.dexStore) {
      throw new Error('dexStore is required in shared state');
    }
    return {
      dexStore: shared.dexStore,
    };
  }

  async exec(params: HealthSummaryQueryInput): Promise<HealthSummaryQueryOutput> {
    const healthSummary = params.dexStore.getSystemHealthSummary();
    return { healthSummary };
  }

  async post(shared: Shared, _prepRes: HealthSummaryQueryInput, execRes: HealthSummaryQueryOutput): Promise<string | undefined> {
    shared.healthSummary = execRes.healthSummary;
    return 'default';
  }
}
