import { describe, expect, it, vi } from 'vitest';

import { TypeCoercer, isTypedWireArg } from './type-coercer';

const logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe('TypeCoercer', () => {
  it('isTypedWireArg identifies wire objects', () => {
    expect(isTypedWireArg({ $type: 'date', value: '2020-01-01' })).toBe(true);
    expect(isTypedWireArg('x')).toBe(false);
  });

  it('coerces date wire args', () => {
    const coercer = new TypeCoercer(logger);
    const out = coercer.coerceArg({ $type: 'date', value: '2020-01-01T00:00:00.000Z' });
    expect(out).toBeInstanceOf(Date);
  });

  it('returns raw value for unknown $type', () => {
    const coercer = new TypeCoercer(logger);
    expect(coercer.coerceArg({ $type: 'unknown', value: 42 })).toBe(42);
  });

  it('allows registering custom types', () => {
    const coercer = new TypeCoercer(logger);
    coercer.register('custom', (v) => `:${String(v)}:`);
    expect(coercer.coerceArg({ $type: 'custom', value: 'a' })).toBe(':a:');
  });

  it('throws a clear error when ObjectId value is invalid', () => {
    const coercer = new TypeCoercer(logger);
    expect(() => coercer.coerceArg({ $type: 'objectid', value: 'ss' })).toThrow(
      /Invalid objectid value "ss"\. Expected a 24-character hexadecimal/
    );
  });

  it('throws when date value is not parseable', () => {
    const coercer = new TypeCoercer(logger);
    expect(() => coercer.coerceArg({ $type: 'date', value: 'not-a-date' })).toThrow(/Invalid date value/);
  });
});
