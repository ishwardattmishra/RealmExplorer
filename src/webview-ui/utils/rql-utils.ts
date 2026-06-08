import type { FilterRow, RealmSchemaInfo } from '../types';

export interface ParameterizedQuery {
  filter: string;
  args: unknown[];
}

/**
 * Builds a parameterized RQL string and an array of values.
 */
export function buildParameterizedRql(
  filters: FilterRow[],
  currentSchema?: RealmSchemaInfo
): ParameterizedQuery {
  const args: unknown[] = [];

  const filter = filters
    .filter((row) => row.field && row.value !== '')
    .map((row, index) => {
      const part = index > 0 ? ` ${row.logic} ` : '';
      const fieldType = currentSchema?.properties[row.field]?.type?.toLowerCase();

      let value: unknown = row.value;

      if (fieldType === 'int' || fieldType === 'double' || fieldType === 'float') {
        const num = Number(row.value);
        if (!isNaN(num)) {
          value = num;
        }
      } else if (fieldType === 'bool') {
        value = row.value.toLowerCase() === 'true' || row.value === '1';
      } else if (fieldType === 'date') {
        try {
          // Replace '@' with 'T' to accept "2024-01-01@12:00:00" as a common
          // user-friendly alternative to ISO-8601's 'T' separator.
          const date = new Date(row.value.replace('@', 'T'));
          if (!isNaN(date.getTime())) {
            value = { $type: 'date', value: date.toISOString() };
          }
        } catch {
          // Keep as string if invalid
        }
      } else if (fieldType === 'decimal128') {
        value = { $type: 'decimal128', value: row.value };
      } else if (fieldType === 'objectid') {
        value = { $type: 'objectid', value: row.value };
      } else if (fieldType === 'uuid') {
        value = { $type: 'uuid', value: row.value };
      }

      const placeholder = `$${args.length}`;
      args.push(value);

      return part + `${row.field} ${row.operator} ${placeholder}`;
    })
    .join('');

  return { filter, args };
}
