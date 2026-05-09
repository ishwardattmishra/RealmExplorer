import { describe, expect, it } from 'vitest';

import { toErrorMessage } from './error-utils';

describe('toErrorMessage', () => {
  it('returns message for Error', () => {
    expect(toErrorMessage(new Error('x'))).toBe('x');
  });

  it('returns fallback for non-Error', () => {
    expect(toErrorMessage('oops')).toBe('Unknown error');
  });
});
