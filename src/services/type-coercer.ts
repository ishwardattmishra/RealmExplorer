import { Realm } from 'realm';

import type { ILogger } from './ilogger';

export type CoerceFn = (value: unknown) => unknown;

export function isTypedWireArg(arg: unknown): arg is { $type: string; value: unknown } {
  return !!arg && typeof arg === 'object' && '$type' in arg && 'value' in arg;
}

const COERCION_HINTS: Record<string, string> = {
  objectid: 'Expected a 24-character hexadecimal MongoDB ObjectId.',
  uuid: 'Expected a valid UUID string.',
  decimal128: 'Expected a valid Decimal128 string.',
  date: 'Expected a parseable date (e.g. ISO-8601).',
};

function formatCoercionFailureMessage(typeKey: string, val: unknown, cause: unknown): string {
  const display = typeof val === 'string' ? `"${val}"` : String(val);
  const hint = COERCION_HINTS[typeKey] ?? 'Value could not be converted for this type.';
  const suffix = cause instanceof Error && cause.message ? ` (${cause.message})` : '';
  return `Invalid ${typeKey} value ${display}. ${hint}${suffix}`;
}

/**
 * Pluggable coercion for filter args sent from the webview (`$type` + `value`).
 */
export class TypeCoercer {
  private readonly handlers = new Map<string, CoerceFn>();

  constructor(private readonly logger: ILogger) {
    this.registerDefaults();
  }

  /** Register or override a coercion for a lowercased type key. */
  register(typeKey: string, fn: CoerceFn): void {
    this.handlers.set(typeKey.toLowerCase(), fn);
  }

  private registerDefaults(): void {
    this.register('date', (val) => {
      const d = new Date(String(val));
      if (Number.isNaN(d.getTime())) {
        throw new Error('Invalid date');
      }
      return d;
    });
    this.register('objectid', (val) => new Realm.BSON.ObjectId(val as string | Realm.BSON.ObjectId));
    this.register('uuid', (val) => new Realm.BSON.UUID(val as string | Realm.BSON.UUID));
    this.register('decimal128', (val) => Realm.BSON.Decimal128.fromString(String(val)));
  }

  coerceArg(arg: unknown): unknown {
    if (!isTypedWireArg(arg)) {
      return arg;
    }
    const typeKey = String(arg.$type).toLowerCase();
    const handler = this.handlers.get(typeKey);
    const val = arg.value;
    if (!handler) {
      return val;
    }
    try {
      return handler(val);
    } catch (e) {
      this.logger.warn(`Failed to convert value ${String(val)} to ${typeKey}:`, e);
      throw new Error(formatCoercionFailureMessage(typeKey, val, e));
    }
  }

  coerceArgs(args: unknown[]): unknown[] {
    return args.map((a) => this.coerceArg(a));
  }
}
