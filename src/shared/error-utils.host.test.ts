import { describe, expect, it } from 'vitest';

import { toErrorMessage } from './error-utils';

describe('toErrorMessage', () => {
  it('returns message for Error', () => {
    expect(toErrorMessage(new Error('x'))).toBe('x');
  });

  it('returns the string itself for a thrown string', () => {
    expect(toErrorMessage('oops')).toBe('oops');
  });

  it('returns String() coercion for other types', () => {
    expect(toErrorMessage(42)).toBe('42');
    expect(toErrorMessage(null)).toBe('null');
  });
});
