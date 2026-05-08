import { describe, it, expect } from 'vitest';
import { buildParameterizedRql } from './rql-utils';
import { RealmSchemaInfo, FilterRow } from '../types';

describe('rql-utils', () => {
    const mockSchema: RealmSchemaInfo = {
        name: 'User',
        properties: {
            name: { name: 'name', type: 'string' },
            age: { name: 'age', type: 'int' },
            isActive: { name: 'isActive', type: 'bool' },
            createdAt: { name: 'createdAt', type: 'date' },
            id: { name: 'id', type: 'objectid' }
        }
    };

    it('should build a simple query with placeholders', () => {
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'name', operator: '==', value: 'John' }
        ];
        const result = buildParameterizedRql(filters, mockSchema);
        expect(result.filter).toBe('name == $0');
        expect(result.args).toEqual(['John']);
    });

    it('should handle multiple conditions with logic', () => {
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'name', operator: '==', value: 'John' },
            { id: '2', logic: 'OR', field: 'age', operator: '>', value: '25' }
        ];
        const result = buildParameterizedRql(filters, mockSchema);
        expect(result.filter).toBe('name == $0 OR age > $1');
        expect(result.args).toEqual(['John', 25]);
    });

    it('should handle invalid numeric values', () => {
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'age', operator: '==', value: 'abc' }
        ];
        const result = buildParameterizedRql(filters, mockSchema);
        expect(result.args[0]).toBe('abc');
    });

    it('should convert "1" to true for booleans', () => {
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'isActive', operator: '==', value: '1' }
        ];
        const result = buildParameterizedRql(filters, mockSchema);
        expect(result.args[0]).toBe(true);
    });

    it('should handle invalid date values', () => {
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'createdAt', operator: '>', value: 'invalid-date' }
        ];
        const result = buildParameterizedRql(filters, mockSchema);
        expect(result.args[0]).toBe('invalid-date');
    });

    it('should wrap specialized types like date in metadata objects', () => {
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'createdAt', operator: '>', value: '2023-01-01' }
        ];
        const result = buildParameterizedRql(filters, mockSchema);
        expect(result.args[0]).toEqual({
            $type: 'date',
            value: expect.any(String)
        });
    });

    it('should wrap objectid in metadata objects', () => {
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'id', operator: '==', value: '507f1f77bcf86cd799439011' }
        ];
        const result = buildParameterizedRql(filters, mockSchema);
        expect(result.args[0]).toEqual({
            $type: 'objectid',
            value: '507f1f77bcf86cd799439011'
        });
    });

    it('should wrap decimal128 in metadata objects', () => {
        const schema: RealmSchemaInfo = {
            name: 'Item',
            properties: { price: { name: 'price', type: 'decimal128' } }
        };
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'price', operator: '>', value: '100.50' }
        ];
        const result = buildParameterizedRql(filters, schema);
        expect(result.args[0]).toEqual({
            $type: 'decimal128',
            value: '100.50'
        });
    });

    it('should wrap uuid in metadata objects', () => {
        const schema: RealmSchemaInfo = {
            name: 'Item',
            properties: { uid: { name: 'uid', type: 'uuid' } }
        };
        const filters: FilterRow[] = [
            { id: '1', logic: 'AND', field: 'uid', operator: '==', value: '550e8400-e29b-41d4-a716-446655440000' }
        ];
        const result = buildParameterizedRql(filters, schema);
        expect(result.args[0]).toEqual({
            $type: 'uuid',
            value: '550e8400-e29b-41d4-a716-446655440000'
        });
    });

    it('should return empty query for empty filters', () => {
        const result = buildParameterizedRql([], mockSchema);
        expect(result.filter).toBe('');
        expect(result.args).toEqual([]);
    });
});
