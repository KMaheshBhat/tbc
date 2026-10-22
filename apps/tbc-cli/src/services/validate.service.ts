import { resolveProtocol, type TBCProtocol } from '../lib/protocol.js';
import { runValidationChecks, type TBCValidationResult } from '../lib/validator.js';
import {
  formatMessages, formatProtocolDiscovery, formatValidationAudit,
  formatLoadSpecsDebug, formatLoadCoreMemoriesDebug,
} from '../lib/message.js';

export interface ValidateRootRequest {
  rootDirectory: string;
  verbose: boolean;
  label: string;
  protocol?: TBCProtocol;
  profile?: 'baseline' | 'next';
  audit?: 'full' | 'none';
  guard?: boolean | { suggestion?: string };
  trace?: boolean;
  showProtocolDiscovery?: boolean;
}

export interface ValidateRootResult extends TBCValidationResult { protocol: TBCProtocol; }

export async function validateRoot(request: ValidateRootRequest): Promise<ValidateRootResult> {
  const protocol = request.protocol ?? resolveProtocol(request.rootDirectory, request.profile);
  if (request.showProtocolDiscovery) {
    console.log(formatMessages(formatProtocolDiscovery(protocol, request.label), request.verbose));
  }
  if (request.trace && request.verbose) {
    console.log(formatMessages([...formatLoadSpecsDebug(request.label), ...formatLoadCoreMemoriesDebug(request.label)], true));
  }
  const result = runValidationChecks(request.rootDirectory, protocol, request.label);
  const audit = request.audit ?? (request.verbose || !result.success ? 'full' : 'none');
  if (audit === 'full') console.log(formatMessages(formatValidationAudit(result, request.label), request.verbose));
  if (!result.success && request.guard) {
    const suggestion = typeof request.guard === 'object'
      ? request.guard.suggestion ?? 'Use "tbc sys init" instead.'
      : 'Use "tbc sys init" instead.';
    console.log(formatMessages([{ level: 'error', source: request.label.replace(/:validate$/, ''), code: 'OVERWRITE-GUARD',
      message: 'has no existing companion (not a valid TBC Root)', suggestion }], request.verbose));
  }
  return { ...result, protocol };
}

export interface ValidateSystemRequest {
  rootDirectory: string;
  verbose: boolean;
  source?: string;
}

export async function validateSystem(
  request: ValidateSystemRequest,
  options?: { sourceContext?: string; showProtocolDiscovery?: boolean; profile?: 'baseline' | 'next' }
): Promise<TBCValidationResult> {
  const source = options?.sourceContext || request.source || 'sys:validate';
  const result = await validateRoot({
    rootDirectory: request.rootDirectory, verbose: request.verbose, label: source,
    profile: options?.profile, audit: 'full', trace: true,
    showProtocolDiscovery: options?.showProtocolDiscovery !== false,
  });
  return result;
}


