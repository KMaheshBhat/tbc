import { describe, expect, test } from 'bun:test';
import { TBC_ROOT, NON_TBC_ROOT, runTbcCommand } from './test-helper';

describe('🐵 0655 validate service orchestration', () => {
  test('valid dex rebuild omits audit without verbose', () => {
    const { output } = runTbcCommand(TBC_ROOT, ['dex', 'rebuild', '--root', TBC_ROOT]);
    expect(output).not.toContain('Validation Audit');
  });

  test('valid verbose dex rebuild includes audit', () => {
    const { output } = runTbcCommand(TBC_ROOT, ['dex', 'rebuild', '--root', TBC_ROOT, '--verbose']);
    expect(output).toContain('Validation Audit');
    expect(output).toContain('STABLE');
  });

  test('valid act show omits audit', () => {
    const { output } = runTbcCommand(TBC_ROOT, ['act', 'show', '--root', TBC_ROOT]);
    expect(output).not.toContain('Validation Audit');
  });

  test('invalid mem remember prints audit and guard', () => {
    const { output } = runTbcCommand(NON_TBC_ROOT, ['mem', 'remember', 'validation test', '--root', NON_TBC_ROOT]);
    expect(output).toContain('Validation Audit');
    expect(output).toContain('has no existing companion (not a valid TBC Root)');
  });

  test('invalid verbose mem remember keeps audit and guard', () => {
    const { output } = runTbcCommand(NON_TBC_ROOT, ['mem', 'remember', 'validation test', '--root', NON_TBC_ROOT, '--verbose']);
    expect(output).toContain('Validation Audit');
    expect(output).toContain('has no existing companion (not a valid TBC Root)');
  });

  test('int probe includes missing root record inside shared audit', () => {
    const { output } = runTbcCommand(NON_TBC_ROOT, ['int', 'probe', '--root', NON_TBC_ROOT]);
    expect(output).toContain('Validation Audit');
    expect(output).toContain('Essential record "root.md" is missing');
    expect(output).toContain('6 error(s) detected.');
    expect(output.indexOf('Essential record \"root.md\" is missing')).toBeLessThan(output.indexOf('DEGRADED'));
  });

  test('dex invalid-root guard keeps its tailored suggestion', () => {
    const { output } = runTbcCommand(NON_TBC_ROOT, ['dex', 'rebuild', '--root', NON_TBC_ROOT]);
    expect(output).toContain('Validation Audit');
    expect(output).toContain('Can only be run on a valid TBC Root.');
  });
});
