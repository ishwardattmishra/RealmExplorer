import type { Realm } from 'realm';

import type { RealmFieldInfo, RealmSchemaInfo } from '../shared/types';
import type { ILogger } from './ilogger';

export function mapRealmSchemaToInfo(realm: Realm, logger: ILogger): RealmSchemaInfo[] {
  try {
    const schema = realm.schema;
    return schema.map((s) => {
      const properties: Record<string, RealmFieldInfo> = {};

      for (const [key, value] of Object.entries(s.properties)) {
        if (typeof value === 'string') {
          properties[key] = { name: key, type: value };
        } else {
          properties[key] = {
            name: key,
            type: value.type,
            optional: value.optional,
            objectType: value.objectType,
          };
        }
      }

      return {
        name: s.name,
        primaryKey: s.primaryKey,
        properties,
      };
    });
  } catch (error) {
    logger.error('Error reading schema:', error);
    return [];
  }
}
