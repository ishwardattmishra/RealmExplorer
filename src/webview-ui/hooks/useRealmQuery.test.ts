import { renderHook, act } from '@testing-library/preact';
import { useRealmQuery } from './useRealmQuery';
import { vscode } from '../vscode';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock vscode
vi.mock('../vscode', () => ({
  vscode: {
    postMessage: vi.fn()
  }
}));

describe('useRealmQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default states', () => {
    const { result } = renderHook(() => useRealmQuery());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.results).toBe(null);
  });

  it('should not execute query if objectType is missing', () => {
    const { result } = renderHook(() => useRealmQuery());
    act(() => {
      result.current.executeQuery({ objectType: '', filter: '', page: 1, pageSize: 20 });
    });
    expect(vscode.postMessage).not.toHaveBeenCalled();
  });

  it('should set loading and post message for executeQuery', () => {
    const { result } = renderHook(() => useRealmQuery());
    act(() => {
      result.current.executeQuery({ objectType: 'User', filter: 'age > 10', page: 1, pageSize: 20 });
    });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: 'executeQuery',
      objectType: 'User',
      filter: 'age > 10',
      args: [],
      page: 1,
      pageSize: 20,
      limit: undefined
    });
  });

  it('should use countQuery command if countOnly is true', () => {
    const { result } = renderHook(() => useRealmQuery());
    act(() => {
      result.current.executeQuery({ objectType: 'User', filter: '', page: 1, pageSize: 20, countOnly: true });
    });
    
    expect(vscode.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      command: 'countQuery'
    }));
  });

  it('should reset results if not countOnly', () => {
    const { result } = renderHook(() => useRealmQuery());
    act(() => {
        result.current.setResults({ data: [], totalCount: 0, executionTimeMs: 0 });
    });
    expect(result.current.results).not.toBeNull();

    act(() => {
      result.current.executeQuery({ objectType: 'User', filter: '', page: 1, pageSize: 20 });
    });
    expect(result.current.results).toBeNull();
  });
});
