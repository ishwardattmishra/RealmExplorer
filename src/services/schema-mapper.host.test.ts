import { describe, expect, it, vi } from 'vitest';

import { mapRealmSchemaToInfo } from './schema-mapper';

const logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe('mapRealmSchemaToInfo', () => {
  it('maps string shorthand properties', () => {
    const realm = {
      schema: [
        {
          name: 'Person',
          primaryKey: 'id',
          properties: {
            id: 'int',
            name: 'string',
          },
        },
      ],
    };
    const out = mapRealmSchemaToInfo(realm as never, logger);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Person');
    expect(out[0].properties.id).toEqual({ name: 'id', type: 'int' });
    expect(out[0].properties.name).toEqual({ name: 'name', type: 'string' });
  });

  it('maps object property definitions', () => {
    const realm = {
      schema: [
        {
          name: 'Task',
          properties: {
            title: { type: 'string', optional: true, objectType: 'Foo' },
          },
        },
      ],
    };
    const out = mapRealmSchemaToInfo(realm as never, logger);
    expect(out[0].properties.title).toMatchObject({
      name: 'title',
      type: 'string',
      optional: true,
      objectType: 'Foo',
    });
  });
});
