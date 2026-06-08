import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { buildParameterizedRql } from './utils/rql-utils';
import { DetailsPanel } from './components/DetailsPanel';
import { EditRowModal } from './components/EditRowModal';
import { FilterPanel } from './components/FilterPanel';
import { DataTable } from './components/DataTable';
import { Header } from './components/Header';
import { Pagination } from './components/Pagination';
import { PendingChangesBar } from './components/PendingChangesBar';
import { Toolbar } from './components/Toolbar';
import { useRealmQuery } from './hooks/useRealmQuery';
import { useVSCodeMessage } from './hooks/useVSCodeMessage';
import { vscode } from './vscode';
import type { FilterRow, RealmRow, RealmSchemaInfo, TabType } from './types';

const App: React.FC = () => {
  const [schema, setSchema] = useState<RealmSchemaInfo[]>(() => globalThis.INITIAL_SCHEMA ?? []);
  const [objectType, setObjectType] = useState<string>(() => globalThis.INITIAL_TYPE ?? '');
  const [pageSize, setPageSize] = useState<number>(20);
  const [limit, setLimit] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<TabType>('visual');
  const [rqlFilter, setRqlFilter] = useState<string>('');
  const [visualFilters, setVisualFilters] = useState<FilterRow[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRow, setSelectedRow] = useState<RealmRow | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());

  // CRUD state
  const [isOpen, setIsOpen] = useState<boolean>(
    () => !!(globalThis.INITIAL_SCHEMA && (globalThis.INITIAL_SCHEMA as RealmSchemaInfo[]).length > 0)
  );
  /** null = closed, null row = adding new, non-null row = editing */
  const [editModalRow, setEditModalRow] = useState<RealmRow | null | undefined>(undefined);
  const [mutationStatus, setMutationStatus] = useState<string | null>(null);
  /** Track recently-edited cells for animation: `${pkValue}-${fieldName}` */
  const [recentlyEdited, setRecentlyEdited] = useState<Set<string>>(new Set());
  
  /** Map from pk string → { field: value } */
  const [pendingChanges, setPendingChanges] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [applyingChanges, setApplyingChanges] = useState(false);

  const { loading, setLoading, error, setError, results, setResults, executeQuery } = useRealmQuery();

  const currentSchema = useMemo(() => schema.find((s) => s.name === objectType), [schema, objectType]);

  const visibleKeys = useMemo(() => {
    if (!currentSchema) {
      return [];
    }
    return Object.keys(currentSchema.properties).filter((key) => visibleColumns.has(key));
  }, [currentSchema, visibleColumns]);

  useEffect(() => {
    if (currentSchema) {
      setVisibleColumns(new Set(Object.keys(currentSchema.properties)));
    }
  }, [currentSchema]);

  const triggerQuery = useCallback(
    (countOnly = false) => {
      let filter = '';
      let args: unknown[] = [];

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
        countOnly,
      });
    },
    [
      objectType,
      activeTab,
      rqlFilter,
      visualFilters,
      currentPage,
      pageSize,
      limit,
      isInitialLoad,
      currentSchema,
      executeQuery,
    ]
  );

  useEffect(() => {
    if (objectType) {
      const timer = setTimeout(() => triggerQuery(false), 300);
      return () => clearTimeout(timer);
    }
  }, [objectType, currentPage, pageSize, triggerQuery]);

  useVSCodeMessage({
    onSelectObjectType: (type) => {
      setObjectType(type);
      setRqlFilter('');
      setVisualFilters([]);
      setCurrentPage(1);
      setSelectedRow(null);
      setIsOpen(true);
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
      setIsOpen(newSchema.length > 0);
    },
    onCount: () => {
      // Count-only queries complete here; clear loading state.
      setLoading(false);
    },
    onRealmClosed: () => {
      setSchema([]);
      setObjectType('');
      setResults(null);
      setSelectedRow(null);
      setIsOpen(false);
      setMutationStatus(null);
      setRecentlyEdited(new Set());
      setPendingChanges(new Map());
      setApplyingChanges(false);
    },
    onMutationSuccess: (action) => {
      const labels = { insert: 'Row inserted successfully', update: 'Updates applied successfully', delete: 'Row deleted successfully' };
      setMutationStatus(labels[action]);
      setTimeout(() => setMutationStatus(null), 3000);
      
      if (action === 'update') {
        setPendingChanges(new Map());
        setApplyingChanges(false);
      }

      // Refresh results
      setIsInitialLoad(false);
      triggerQuery(false);
    },
    onMutationError: (msg) => {
      setError(msg);
      setApplyingChanges(false);
    },
  });

  const handleAddFilterRow = () => {
    setVisualFilters([
      ...visualFilters,
      { id: Date.now().toString(), logic: 'AND', field: '', operator: '==', value: '' },
    ]);
  };

  const handleToggleColumn = (column: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  };

  const handleExport = () => {
    if (!results) {
      return;
    }
    // Send export data to extension host — blob downloads may be blocked
    // by the webview sandbox CSP, so the extension handles file save via
    // vscode.workspace.fs.writeFile + vscode.window.showSaveDialog.
    vscode.postMessage({
      command: 'exportData',
      objectType,
      data: results.data,
    });
  };

  const handleCloseDB = () => {
    vscode.postMessage({ command: 'closeRealm' });
  };

  const handleAddRow = () => {
    setEditModalRow(null); // null = new row
  };

  const handleEditRow = (row: RealmRow) => {
    setEditModalRow(row);
  };

  const handleDeleteRow = (row: RealmRow) => {
    const pk = currentSchema?.primaryKey;
    const primaryKey = pk ? row[pk] : undefined;
    if (primaryKey === undefined) {
      setError('Cannot delete: this object type has no primary key.');
      return;
    }
    vscode.postMessage({ command: 'deleteRow', objectType, primaryKey });
  };

  const handleInlineEdit = useCallback((row: RealmRow, field: string, value: unknown) => {
    const pk = currentSchema?.primaryKey;
    const primaryKey = pk ? row[pk] : undefined;
    if (primaryKey === undefined) {
      setError('Cannot edit: this object type has no primary key.');
      return;
    }
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const pkString = String(primaryKey);
      const rowChanges = next.get(pkString) || {};
      next.set(pkString, { ...rowChanges, [field]: value });
      return next;
    });
  }, [currentSchema, setError]);

  const handleApplyPendingChanges = () => {
    setApplyingChanges(true);
    const updates: Array<{ primaryKey: unknown; field: string; value: unknown }> = [];
    
    // We need original PK types. We can extract them from the results list since we only edit visible rows.
    if (!results || !currentSchema?.primaryKey) {
      setApplyingChanges(false);
      return;
    }
    const pkProp = currentSchema.primaryKey;
    
    pendingChanges.forEach((fields, pkString) => {
      // Find the row to get the actual primary key object if it's an ObjectId or similar
      const row = results.data.find(r => String(r[pkProp]) === pkString);
      if (row) {
        const primaryKey = row[pkProp];
        Object.entries(fields).forEach(([field, value]) => {
          updates.push({ primaryKey, field, value });
          
          // Trigger animations
          const editKey = `${pkString}-${field}`;
          setRecentlyEdited(prev => new Set(prev).add(editKey));
          setTimeout(() => {
            setRecentlyEdited(prev => {
              const next = new Set(prev);
              next.delete(editKey);
              return next;
            });
          }, 2000);
        });
      }
    });

    vscode.postMessage({ command: 'updateRows', objectType, updates });
  };

  const handleDiscardPendingChanges = () => {
    setPendingChanges(new Map());
  };

  const handleModalClose = () => {
    setEditModalRow(undefined); // undefined = modal closed
  };

  const isModalOpen = editModalRow !== undefined;

  return (
    <div className="app-container">
      <Header
        results={results}
        currentSchema={currentSchema}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        onSelectAllColumns={() =>
          currentSchema && setVisibleColumns(new Set(Object.keys(currentSchema.properties)))
        }
        onClearAllColumns={() => setVisibleColumns(new Set())}
        onExport={handleExport}
        onCloseDB={handleCloseDB}
        isOpen={isOpen}
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
        onAddRow={handleAddRow}
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

      {mutationStatus && (
        <div className="mutation-toast" role="status" aria-live="polite">
          <span className="mutation-toast-icon">✓</span>
          {mutationStatus}
        </div>
      )}

      <main className={`content-area ${selectedRow ? 'with-details' : ''}`}>
        <DataTable
          results={results}
          visibleKeys={visibleKeys}
          currentSchema={currentSchema}
          selectedRow={selectedRow}
          onSelectRow={setSelectedRow}
          loading={loading}
          error={error}
          onEditRow={handleEditRow}
          onDeleteRow={handleDeleteRow}
          onInlineEdit={handleInlineEdit}
          pendingChanges={pendingChanges}
          recentlyEdited={recentlyEdited}
        />

        {selectedRow && <DetailsPanel selectedRow={selectedRow} onClose={() => setSelectedRow(null)} />}
      </main>

      <Pagination
        results={results}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
      />

      <PendingChangesBar 
        pendingChanges={pendingChanges}
        onApply={handleApplyPendingChanges}
        onDiscard={handleDiscardPendingChanges}
        applying={applyingChanges}
      />

      {isModalOpen && currentSchema && (
        <EditRowModal
          row={editModalRow ?? null}
          objectType={objectType}
          currentSchema={currentSchema}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default App;
