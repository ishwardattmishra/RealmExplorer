import { render, fireEvent, act } from '@testing-library/preact';
import { FilterPanel } from './FilterPanel';
import { describe, it, expect, vi } from 'vitest';
import { h } from 'preact';

describe('FilterPanel', () => {
  const mockSchema = {
    name: 'User',
    properties: {
      name: { name: 'name', type: 'string' },
      age: { name: 'age', type: 'int' }
    }
  };

  const defaultProps = {
    activeTab: 'visual' as const,
    onTabChange: vi.fn(),
    visualFilters: [
      { id: '1', logic: 'AND', field: 'name', operator: '==', value: 'Alice' }
    ],
    onVisualFiltersChange: vi.fn(),
    rqlFilter: '',
    onRqlFilterChange: vi.fn(),
    currentSchema: mockSchema,
    onAddFilterRow: vi.fn()
  };

  it('should switch between tabs', async () => {
    const { getByText } = render(<FilterPanel {...defaultProps} />);
    await act(async () => {
        fireEvent.click(getByText('Raw RQL'));
    });
    expect(defaultProps.onTabChange).toHaveBeenCalledWith('rql');
  });

  it('should update field select', async () => {
    const { container } = render(<FilterPanel {...defaultProps} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    await act(async () => {
        select.value = 'age';
        select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(defaultProps.onVisualFiltersChange).toHaveBeenCalled();
  });

  it('should remove row when ✕ is clicked', async () => {
    const multiFilters = [
      { id: '1', logic: 'AND', field: 'name', operator: '==', value: 'Alice' },
      { id: '2', logic: 'OR', field: 'age', operator: '>', value: '20' }
    ];
    const { getByText } = render(<FilterPanel {...defaultProps} visualFilters={multiFilters} />);
    await act(async () => {
        fireEvent.click(getByText('✕'));
    });
    expect(defaultProps.onVisualFiltersChange).toHaveBeenCalled();
  });

  it('should update row value', async () => {
    const { getByPlaceholderText } = render(<FilterPanel {...defaultProps} />);
    const input = getByPlaceholderText('Value') as HTMLInputElement;
    await act(async () => {
        fireEvent.input(input, { target: { value: 'Bob' } });
    });
    expect(defaultProps.onVisualFiltersChange).toHaveBeenCalled();
  });

  it('should update rql filter text', async () => {
    const props = { ...defaultProps, activeTab: 'rql' as const };
    const { getByPlaceholderText } = render(<FilterPanel {...props} />);
    const textarea = getByPlaceholderText(/e.g. age > 21/);
    await act(async () => {
        fireEvent.input(textarea, { target: { value: 'age > 30' } });
    });
    expect(defaultProps.onRqlFilterChange).toHaveBeenCalledWith('age > 30');
  });

  it('should update logic in multi-row filter', async () => {
    const multiFilters = [
      { id: '1', logic: 'AND', field: 'name', operator: '==', value: 'Alice' },
      { id: '2', logic: 'OR', field: 'age', operator: '>', value: '20' }
    ];
    const { container } = render(<FilterPanel {...defaultProps} visualFilters={multiFilters} />);
    const logicSelect = container.querySelectorAll('select')[0] as HTMLSelectElement; 
    await act(async () => {
        logicSelect.value = 'AND';
        logicSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(defaultProps.onVisualFiltersChange).toHaveBeenCalled();
  });
});
