import { render, fireEvent, act } from '@testing-library/preact';
import App from './App';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock hooks
vi.mock('./hooks/useVSCodeMessage', () => ({
  useVSCodeMessage: vi.fn(({ onSelectObjectType, onResults, onError, onSchema }) => {
    // Expose handlers for testing
    (globalThis as any).testHandlers = { onSelectObjectType, onResults, onError, onSchema };
  })
}));

const mockExecuteQuery = vi.fn();
let mockResultsState: any = null;
vi.mock('./hooks/useRealmQuery', () => ({
  useRealmQuery: () => ({
    loading: false,
    setLoading: vi.fn(),
    error: null,
    setError: vi.fn(),
    results: mockResultsState,
    setResults: vi.fn((res) => { mockResultsState = res; }),
    executeQuery: mockExecuteQuery
  })
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResultsState = null;
    (globalThis as any).INITIAL_SCHEMA = [
      { name: 'User', properties: { name: { type: 'string' }, age: { type: 'int' } } }
    ];
    (globalThis as any).INITIAL_TYPE = 'User';
    // Mock URL and Blob for export test
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:url');
  });

  it('should render main components', () => {
    const { getByLabelText } = render(<App />);
    expect(getByLabelText('Object Type')).toBeTruthy();
  });

  it('should handle schema updates from VS Code', async () => {
    render(<App />);
    const newSchema = [{ name: 'Task', properties: { title: { type: 'string' } } }];
    
    await act(async () => {
      (globalThis as any).testHandlers.onSchema(newSchema);
    });
  });

  it('should add a filter row', async () => {
    const { getByText, getAllByPlaceholderText } = render(<App />);
    const addBtn = getByText('+ Add Filter');
    await act(async () => {
        fireEvent.click(addBtn);
    });
    expect(getAllByPlaceholderText('Value').length).toBe(1);
  });

  it('should execute query when Run Query is clicked', async () => {
    const { getByText } = render(<App />);
    const runBtn = getByText('Run Query');
    await act(async () => {
        fireEvent.click(runBtn);
    });
    expect(mockExecuteQuery).toHaveBeenCalled();
  });

  it('should handle export click', async () => {
    const { findByText, rerender } = render(<App />);
    
    await act(async () => {
        (globalThis as any).testHandlers.onResults({
          data: [{ id: 1 }],
          totalCount: 1,
          page: 1,
          pageSize: 20,
          executionTimeMs: 10,
        });
    });
    
    // Rerender to ensure state update is reflected in props of subcomponents
    rerender(<App />);

    const exportBtn = await findByText('Export JSON');
    await act(async () => {
        fireEvent.click(exportBtn);
    });
    
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });
});
