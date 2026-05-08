import { render, fireEvent, act } from '@testing-library/preact';
import { Header } from './Header';
import { describe, it, expect, vi } from 'vitest';
import { h } from 'preact';

describe('Header', () => {
  const mockResults = {
    data: [],
    totalCount: 42,
    executionTimeMs: 10
  };

  const defaultProps = {
    results: mockResults,
    objectType: 'User',
    currentSchema: { name: 'User', properties: { name: {}, age: {} } },
    visibleColumns: new Set(['name']),
    onToggleColumn: vi.fn(),
    onSelectAllColumns: vi.fn(),
    onClearAllColumns: vi.fn(),
    onExport: vi.fn()
  };

  it('should close column picker when clicking outside', async () => {
    const { getByText, queryByText } = render(<Header {...defaultProps} />);
    
    // Open it
    await act(async () => {
        fireEvent.click(getByText('👁️ Columns'));
    });
    expect(getByText('SELECT COLUMNS')).toBeTruthy();

    // Click outside
    await act(async () => {
        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    
    expect(queryByText('SELECT COLUMNS')).toBeNull();
  });
});
