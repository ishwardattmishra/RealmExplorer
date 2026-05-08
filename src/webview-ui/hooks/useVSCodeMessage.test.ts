import { renderHook } from '@testing-library/preact';
import { useVSCodeMessage } from './useVSCodeMessage';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('useVSCodeMessage', () => {
  const handlers = {
    onSelectObjectType: vi.fn(),
    onResults: vi.fn(),
    onError: vi.fn(),
    onSchema: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register message event listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useVSCodeMessage(handlers));
    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should call onSelectObjectType when selectObjectType command is received', () => {
    renderHook(() => useVSCodeMessage(handlers));
    
    const messageEvent = new MessageEvent('message', {
      data: { command: 'selectObjectType', objectType: 'User' }
    });
    window.dispatchEvent(messageEvent);

    expect(handlers.onSelectObjectType).toHaveBeenCalledWith('User');
  });

  it('should call onResults when results command is received', () => {
    renderHook(() => useVSCodeMessage(handlers));
    
    const results = { items: [], totalCount: 0, executionTimeMs: 10 };
    const messageEvent = new MessageEvent('message', {
      data: { command: 'results', results }
    });
    window.dispatchEvent(messageEvent);

    expect(handlers.onResults).toHaveBeenCalledWith(results);
  });

  it('should call onError when error command is received', () => {
    renderHook(() => useVSCodeMessage(handlers));
    
    const messageEvent = new MessageEvent('message', {
      data: { command: 'error', message: 'Something went wrong' }
    });
    window.dispatchEvent(messageEvent);

    expect(handlers.onError).toHaveBeenCalledWith('Something went wrong');
  });

  it('should call onSchema when schema command is received', () => {
    renderHook(() => useVSCodeMessage(handlers));
    
    const schema = [{ name: 'User', properties: [] }];
    const messageEvent = new MessageEvent('message', {
      data: { command: 'schema', schema }
    });
    window.dispatchEvent(messageEvent);

    expect(handlers.onSchema).toHaveBeenCalledWith(schema);
  });

  it('should unregister message event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useVSCodeMessage(handlers));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });
});
