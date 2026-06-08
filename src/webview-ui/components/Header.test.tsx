import { render, fireEvent, act } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  const mockResults = {
    data: [],
    totalCount: 42,
    page: 1,
    pageSize: 20,
    executionTimeMs: 10,
  };

  const defaultProps = {
    results: mockResults,
    currentSchema: {
      name: 'User',
      properties: {
        name: { name: 'name', type: 'string' },
        age: { name: 'age', type: 'int' },
      },
    },
    visibleColumns: new Set(['name']),
    onToggleColumn: vi.fn(),
    onSelectAllColumns: vi.fn(),
    onClearAllColumns: vi.fn(),
    onExport: vi.fn(),
    onCloseDB: vi.fn(),
    isOpen: false,
  };

  it('should close column picker when clicking outside', async () => {
    const { getByText, queryByText } = render(<Header {...defaultProps} />);

    await act(async () => {
      fireEvent.click(getByText('Columns'));
    });
    expect(getByText('SELECT COLUMNS')).toBeTruthy();

    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(queryByText('SELECT COLUMNS')).toBeNull();
  });

  it('should handle Close DB confirmation flow', async () => {
    const onCloseDB = vi.fn();
    const { getByText, queryByText, getByTitle } = render(
      <Header {...defaultProps} isOpen={true} onCloseDB={onCloseDB} />
    );

    // Initial state: Close DB button is visible
    const closeBtn = getByTitle('Close the current Realm database');
    expect(closeBtn).toBeTruthy();

    // Click Close DB -> Enter confirmation state
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    expect(getByText('Close DB?')).toBeTruthy();
    expect(getByText('Confirm')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(queryByText('Close DB')).toBeNull();

    // Click Cancel -> Return to initial state
    await act(async () => {
      fireEvent.click(getByText('Cancel'));
    });

    expect(queryByText('Close DB?')).toBeNull();
    expect(getByText('Close DB')).toBeTruthy();

    // Click Close DB again -> Confirm
    await act(async () => {
      fireEvent.click(getByText('Close DB'));
    });

    await act(async () => {
      fireEvent.click(getByText('Confirm'));
    });

    expect(onCloseDB).toHaveBeenCalledTimes(1);
    expect(queryByText('Close DB?')).toBeNull();
  });

  it('should auto-cancel Close DB confirmation after timeout', async () => {
    vi.useFakeTimers();
    const { getByText, queryByText } = render(
      <Header {...defaultProps} isOpen={true} />
    );

    await act(async () => {
      fireEvent.click(getByText('Close DB'));
    });

    expect(getByText('Close DB?')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(4001);
    });

    expect(queryByText('Close DB?')).toBeNull();
    expect(getByText('Close DB')).toBeTruthy();
    
    vi.useRealTimers();
  });
});
