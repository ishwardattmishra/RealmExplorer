import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { FilterPanel } from './components/FilterPanel';
import { DataTable } from './components/DataTable';
import { DetailsPanel } from './components/DetailsPanel';
import { Pagination } from './components/Pagination';
import { useVSCodeMessage } from './hooks/useVSCodeMessage';
import { useRealmQuery } from './hooks/useRealmQuery';
import { buildParameterizedRql } from './utils/rql-utils';
import { RealmSchemaInfo, FilterRow, TabType } from './types';

const App: React.FC = () => {
    // Shared State
    const [schema, setSchema] = useState<RealmSchemaInfo[]>((globalThis as any).INITIAL_SCHEMA || []);
    const [objectType, setObjectType] = useState<string>((globalThis as any).INITIAL_TYPE || '');
    const [pageSize, setPageSize] = useState<number>(20);
    const [limit, setLimit] = useState<number>(1000);
    const [activeTab, setActiveTab] = useState<TabType>('visual');
    const [rqlFilter, setRqlFilter] = useState<string>('');
    const [visualFilters, setVisualFilters] = useState<FilterRow[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());

    const { 
        loading, 
        setLoading, 
        error, 
        setError, 
        results, 
        setResults, 
        executeQuery 
    } = useRealmQuery();

    const currentSchema = useMemo(() => schema.find(s => s.name === objectType), [schema, objectType]);

    // Derived State
    const visibleKeys = useMemo(() => {
        if (!currentSchema) return [];
        return Object.keys(currentSchema.properties).filter(key => visibleColumns.has(key));
    }, [currentSchema, visibleColumns]);

    // Effects
    useEffect(() => {
        if (currentSchema) {
            setVisibleColumns(new Set(Object.keys(currentSchema.properties)));
        }
    }, [currentSchema]);

    const triggerQuery = useCallback((countOnly = false) => {
        let filter = '';
        let args: any[] = [];

        if (isInitialLoad) {
            setIsInitialLoad(false);
        } else if (activeTab === 'rql') {
            filter = rqlFilter;
        } else {
            const parameterized = buildParameterizedRql(visualFilters, currentSchema);
            filter = parameterized.filter;
            args = parameterized.args;
        }

        executeQuery({
            objectType,
            filter,
            args,
            page: currentPage,
            pageSize,
            limit,
            countOnly
        });
    }, [objectType, activeTab, rqlFilter, visualFilters, currentPage, pageSize, limit, isInitialLoad, currentSchema, executeQuery]);

    useEffect(() => {
        if (objectType) {
            const timer = setTimeout(() => triggerQuery(false), 100);
            return () => clearTimeout(timer);
        }
    }, [objectType, currentPage, pageSize, triggerQuery]);

    // Message Handling
    useVSCodeMessage({
        onSelectObjectType: (type) => {
            setObjectType(type);
            setRqlFilter('');
            setVisualFilters([]);
            setCurrentPage(1);
            setSelectedRow(null);
        },
        onResults: (res) => {
            setResults(res);
            setLoading(false);
        },
        onError: (msg) => {
            setError(msg);
            setLoading(false);
        },
        onSchema: (newSchema) => {
            setSchema(newSchema);
        }
    });

    // Actions
    const handleAddFilterRow = () => {
        setVisualFilters([
            ...visualFilters,
            { id: Date.now().toString(), logic: 'AND', field: '', operator: '==', value: '' }
        ]);
    };

    const handleToggleColumn = (column: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(column)) next.delete(column);
            else next.add(column);
            return next;
        });
    };

    const handleExport = () => {
        if (!results) return;
        const dataStr = JSON.stringify(results.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `realm-${objectType}.json`;
        link.click();
    };

    return (
        <div className="app-container">
            <Header 
                results={results}
                objectType={objectType}
                currentSchema={currentSchema}
                visibleColumns={visibleColumns}
                onToggleColumn={handleToggleColumn}
                onSelectAllColumns={() => currentSchema && setVisibleColumns(new Set(Object.keys(currentSchema.properties)))}
                onClearAllColumns={() => setVisibleColumns(new Set())}
                onExport={handleExport}
            />

            <Toolbar 
                schema={schema}
                objectType={objectType}
                onObjectTypeChange={(type) => {
                    setObjectType(type);
                    setCurrentPage(1);
                }}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                limit={limit}
                onLimitChange={setLimit}
                onRunQuery={() => triggerQuery(false)}
                loading={loading}
            />

            <FilterPanel 
                activeTab={activeTab}
                onTabChange={setActiveTab}
                visualFilters={visualFilters}
                onVisualFiltersChange={setVisualFilters}
                rqlFilter={rqlFilter}
                onRqlFilterChange={setRqlFilter}
                currentSchema={currentSchema}
                onAddFilterRow={handleAddFilterRow}
            />

            <main className={`content-area ${selectedRow ? 'with-details' : ''}`}>
                <DataTable 
                    results={results}
                    visibleKeys={visibleKeys}
                    currentSchema={currentSchema}
                    selectedRow={selectedRow}
                    onSelectRow={setSelectedRow}
                    loading={loading}
                    error={error}
                />

                {selectedRow && (
                    <DetailsPanel 
                        selectedRow={selectedRow} 
                        onClose={() => setSelectedRow(null)} 
                    />
                )}
            </main>

            <Pagination 
                results={results}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
            />
        </div>
    );
};

export default App;
