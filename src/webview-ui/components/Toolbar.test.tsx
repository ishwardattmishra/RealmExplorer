import { render, fireEvent, act } from '@testing-library/preact';
import { Toolbar } from './Toolbar';
import { describe, it, expect, vi } from 'vitest';
describe('Toolbar', () => {
  const mockSchema = [
    { name: 'User', properties: {} },
    { name: 'Task', properties: {} }
  ];

  const defaultProps = {
    schema: mockSchema,
    objectType: 'User',
    onObjectTypeChange: vi.fn(),
    pageSize: 20,
    onPageSizeChange: vi.fn(),
    limit: 1000,
    onLimitChange: vi.fn(),
    onRunQuery: vi.fn(),
    loading: false
  };

  it('should render schema options', () => {
    const { getByText } = render(<Toolbar {...defaultProps} />);
    expect(getByText('User')).toBeTruthy();
    expect(getByText('Task')).toBeTruthy();
  });

  it('should call onObjectTypeChange when selection changes', async () => {
    const { getByLabelText } = render(<Toolbar {...defaultProps} />);
    const select = getByLabelText('Object Type') as HTMLSelectElement;
    await act(async () => {
        fireEvent.change(select, { target: { value: 'Task' } });
    });
    // If fireEvent.change doesn't work, try direct dispatch
    if (defaultProps.onObjectTypeChange.mock.calls.length === 0) {
        await act(async () => {
            select.value = 'Task';
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
    expect(defaultProps.onObjectTypeChange).toHaveBeenCalledWith('Task');
  });

  it('should call onPageSizeChange when selection changes', async () => {
    const { getByLabelText } = render(<Toolbar {...defaultProps} />);
    const select = getByLabelText('Page Size') as HTMLSelectElement;
    await act(async () => {
        fireEvent.change(select, { target: { value: '50' } });
    });
    if (defaultProps.onPageSizeChange.mock.calls.length === 0) {
        await act(async () => {
            select.value = '50';
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
    expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('should call onLimitChange when input changes', async () => {
    const { getByLabelText } = render(<Toolbar {...defaultProps} />);
    const input = getByLabelText('Total Limit') as HTMLInputElement;
    await act(async () => {
        fireEvent.input(input, { target: { value: '500' } });
    });
    expect(defaultProps.onLimitChange).toHaveBeenCalledWith(500);
  });

  it('should call onRunQuery when Run Query is clicked', () => {
    const { getByText } = render(<Toolbar {...defaultProps} />);
    fireEvent.click(getByText('Run Query'));
    expect(defaultProps.onRunQuery).toHaveBeenCalled();
  });
});
