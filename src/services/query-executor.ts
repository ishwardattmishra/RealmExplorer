import type { Realm } from 'realm';

import type { QueryResult, RealmRow } from '../shared/types';
import type { ILogger } from './ilogger';
import { RealmSession } from './realm-session';
import { TypeCoercer } from './type-coercer';

/**
 * Runs filtered queries and pagination against an open Realm session.
 */
export class QueryExecutor {
  constructor(
    private readonly session: RealmSession,
    private readonly typeCoercer: TypeCoercer,
    private readonly logger: ILogger
  ) {}

  private getFilteredResults(
    realm: Realm,
    objectType: string,
    filter: string,
    args: unknown[] = [],
  ) {
    const processedArgs = this.typeCoercer.coerceArgs(args);

    let results = realm.objects(objectType);
    if (filter) {
      results = results.filtered(filter, ...processedArgs);
    }

    return results;
  }

  async executeQuery(
    objectType: string,
    filter: string,
    args: unknown[],
    page: number,
    pageSize: number,
    limit?: number
  ): Promise<QueryResult> {
    this.logger.info(`Executing query on ${objectType}`, { filter, args, page, pageSize, limit });
    const startTime = Date.now();
    const realm = this.session.getRealmOrThrow();

    const results = this.getFilteredResults(realm, objectType, filter, args);
    const rawCount = results.length;
    // Apply limit without materializing a copy — just clamp indices
    const totalCount = (limit !== undefined && limit > 0) ? Math.min(rawCount, limit) : rawCount;
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalCount);

    this.logger.info(`Query returned ${totalCount} total records. Fetching page ${page}...`);

    const data: RealmRow[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      const item = results[i] as { toJSON?: () => RealmRow } | RealmRow;
      if (item && typeof item === 'object' && 'toJSON' in item && typeof item.toJSON === 'function') {
        data.push(item.toJSON() as RealmRow);
      } else {
        data.push(item as RealmRow);
      }
    }

    const executionTimeMs = Date.now() - startTime;
    this.logger.info(`Query completed in ${executionTimeMs}ms`);

    return {
      data,
      totalCount,
      page,
      pageSize,
      executionTimeMs,
    };
  }

  async countQuery(
    objectType: string,
    filter: string,
    args: unknown[] = []
  ): Promise<{ count: number; executionTimeMs: number }> {
    const startTime = Date.now();
    const realm = this.session.getRealmOrThrow();
    const results = this.getFilteredResults(realm, objectType, filter, args);
    return {
      count: results.length,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
