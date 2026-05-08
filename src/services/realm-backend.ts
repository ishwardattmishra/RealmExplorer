import { Realm } from 'realm';
import { Logger } from './logger';




export interface RealmFieldInfo {
  name: string;
  type: string;
  optional?: boolean;
  objectType?: string;
}

export interface RealmSchemaInfo {
  name: string;
  primaryKey?: string;
  properties: Record<string, RealmFieldInfo>;
}

export interface QueryResult {
  data: unknown[];
  totalCount: number;
  page: number;
  pageSize: number;
  executionTimeMs: number;
}

export class RealmBackend {
  private realm: Realm | null = null;

  async openRealm(filePath: string, readOnly = true): Promise<RealmSchemaInfo[]> {
    Logger.info(`Opening Realm: ${filePath} (readOnly: ${readOnly})`);
    try {
      this.closeRealm();

      Logger.info('Calling Realm.open...');
      this.realm = await Realm.open({
        path: filePath,
        readOnly: readOnly,
      });
      Logger.info('Realm opened successfully');

      const schema = this.getSchema();
      Logger.info(`Loaded schema with ${schema.length} object types`);
      return schema;
    } catch (error) {
      Logger.error('Failed to open Realm:', error);
      throw error;
    }
  }

  getSchema(): RealmSchemaInfo[] {
    if (!this.realm || this.realm.isClosed) {
        return [];
    }

    try {
      const schema = this.realm.schema;
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
      Logger.error('Error reading schema:', error);
      return [];
    }
  }

  private getFilteredResults(objectType: string, filter: string, args: unknown[] = [], limit?: number) {
    if (!this.realm || this.realm.isClosed) {
      throw new Error('Realm is not open or has been closed.');
    }
    
    try {
      // Process arguments to convert specialized objects back to native types
      const processedArgs = args.map(arg => {
        if (arg && typeof arg === 'object' && '$type' in arg && 'value' in arg) {
          const val = (arg as any).value;
          switch ((arg as any).$type) {
            case 'date': return new Date(val);
            case 'objectid': return new Realm.BSON.ObjectId(val);
            case 'uuid': return new Realm.BSON.UUID(val);
            case 'decimal128': return Realm.BSON.Decimal128.fromString(val);
          }
        }
        return arg;
      });

      let results = this.realm.objects(objectType);
      if (filter) {
        results = results.filtered(filter, ...processedArgs);
      }
      
      if (limit !== undefined && limit > 0) {
        // Apply limit to the results
        return results.slice(0, limit);
      }

      return results;
    } catch (error) {
      Logger.error(`Error filtering objects of type ${objectType}:`, error);
      throw error;
    }
  }

  async executeQuery(
    objectType: string,
    filter: string,
    args: unknown[],
    page: number,
    pageSize: number,
    limit?: number
  ): Promise<QueryResult> {
    Logger.info(`Executing query on ${objectType}`, { filter, args, page, pageSize, limit });
    const startTime = Date.now();
    
    try {
      const results = this.getFilteredResults(objectType, filter, args, limit);
      const totalCount = results.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalCount);

      Logger.info(`Query returned ${totalCount} total records. Fetching page ${page}...`);

      const data = [];
      for (let i = startIndex; i < endIndex; i++) {
        const item = results[i];
        if (item && typeof item.toJSON === 'function') {
          data.push(item.toJSON());
        } else {
          data.push(item);
        }
      }

      const executionTimeMs = Date.now() - startTime;
      Logger.info(`Query completed in ${executionTimeMs}ms`);

      return {
        data,
        totalCount,
        page,
        pageSize,
        executionTimeMs,
      };
    } catch (error) {
      Logger.error('Query execution failed:', error);
      throw error;
    }
  }

  async countQuery(
    objectType: string,
    filter: string,
    args: unknown[] = []
  ): Promise<{ count: number; executionTimeMs: number }> {
    const startTime = Date.now();
    try {
      const results = this.getFilteredResults(objectType, filter, args);
      return {
        count: results.length,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      Logger.error('Count query failed:', error);
      throw error;
    }
  }

  closeRealm(): void {
    if (this.realm && !this.realm.isClosed) {
      Logger.info('Closing Realm');
      try {
        this.realm.close();
      } catch (error) {
        Logger.error('Error closing Realm:', error);
      } finally {
        this.realm = null;
      }
    }
  }

  isOpen(): boolean {
    return !!this.realm && !this.realm.isClosed;
  }
}
