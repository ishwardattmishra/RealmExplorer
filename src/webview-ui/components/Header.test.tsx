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
});
