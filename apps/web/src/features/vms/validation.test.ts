import { describe, expect, it } from 'vitest';
import { validateVmField } from './validation';

describe('validateVmField', () => {
  it('accepts letters, numbers, spaces and the allowed punctuation in names', () => {
    expect(validateVmField('name', 'Producción API_2.0')).toBe('');
  });

  it.each(['A', 'Production/DB'])('rejects invalid VM name: %s', (name) => {
    expect(validateVmField('name', name)).not.toBe('');
  });

  it('trims surrounding whitespace from VM names', () => {
    expect(validateVmField('name', ' leading-space ')).toBe('');
  });

  it.each([
    ['cores', 1],
    ['cores', 128],
    ['ram', 1],
    ['ram', 2048],
    ['disk', 1],
    ['disk', 10000],
  ] as const)('accepts the %s boundary value %i', (field, value) => {
    expect(validateVmField(field, value)).toBe('');
  });

  it.each([
    ['cores', 0],
    ['cores', 129],
    ['ram', 0],
    ['ram', 2049],
    ['disk', 0],
    ['disk', 10001],
  ] as const)('rejects the %s out-of-range value %i', (field, value) => {
    expect(validateVmField(field, value)).not.toBe('');
  });

  it('requires a recognizable operating system value', () => {
    expect(validateVmField('os', ' ')).not.toBe('');
    expect(validateVmField('os', 'Debian 12')).toBe('');
  });
});
