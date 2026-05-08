import { render, fireEvent } from '@testing-library/preact';
import { DetailsPanel } from './DetailsPanel';
import { describe, it, expect, vi } from 'vitest';
import { h } from 'preact';

describe('DetailsPanel', () => {
  const mockRow = { _id: '1', name: 'Test' };
  const mockOnClose = vi.fn();

  it('should render the selected row as JSON', () => {
    const { getByText } = render(<DetailsPanel selectedRow={mockRow} onClose={mockOnClose} />);
    expect(getByText(/"name": "Test"/)).toBeTruthy();
  });

  it('should call onClose when close button is clicked', () => {
    const { getByText } = render(<DetailsPanel selectedRow={mockRow} onClose={mockOnClose} />);
    const closeButton = getByText('✕');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
