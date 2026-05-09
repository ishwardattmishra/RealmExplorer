import { render, fireEvent } from '@testing-library/preact';
import { DataTable } from './DataTable';
import { describe, it, expect, vi } from 'vitest';
// Mock SmartCell
vi.mock('./SmartCell', () => ({
  SmartCell: ({ value }: { value: any }) => <span>{String(value)}</span>
}));

describe('DataTable', () => {
  const mockResults = {
    data: [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ],
    totalCount: 2,
    page: 1,
    pageSize: 20,
    executionTimeMs: 5,
  };

  const defaultProps = {
    results: mockResults,
    visibleKeys: ['id', 'name'],
    selectedRow: null,
    onSelectRow: vi.fn(),
    loading: false,
    error: null
  };

  it('should render table headers and rows', () => {
    const { getByText } = render(<DataTable {...defaultProps} />);
    expect(getByText('id')).toBeTruthy();
    expect(getByText('name')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('should show loading spinner when loading is true', () => {
    const { container } = render(<DataTable {...defaultProps} loading={true} />);
    expect(container.querySelector('.spinner')).toBeTruthy();
  });

  it('should show error message if error is provided', () => {
    const { getByText } = render(<DataTable {...defaultProps} error="Fail" />);
    expect(getByText('Fail')).toBeTruthy();
  });

  it('should show empty state if no results', () => {
    const emptyResults = { data: [], totalCount: 0, page: 1, pageSize: 20, executionTimeMs: 0 };
    const { getByText } = render(<DataTable {...defaultProps} results={emptyResults} />);
    expect(getByText('No results found')).toBeTruthy();
  });

  it('should call onSelectRow when a row is clicked', () => {
    const { getByText } = render(<DataTable {...defaultProps} />);
    fireEvent.click(getByText('Alice'));
    expect(defaultProps.onSelectRow).toHaveBeenCalledWith(mockResults.data[0]);
  });

  it('should apply selected class to selected row', () => {
    const { container } = render(<DataTable {...defaultProps} selectedRow={mockResults.data[0]} />);
    const tr = container.querySelector('tbody tr');
    expect(tr?.classList.contains('selected')).toBe(true);
  });
});
