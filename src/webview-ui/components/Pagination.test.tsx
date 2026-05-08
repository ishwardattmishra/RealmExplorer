import { render, fireEvent } from '@testing-library/preact';
import { Pagination } from './Pagination';
import { vi, describe, it, expect } from 'vitest';
import { h } from 'preact';

describe('Pagination', () => {
  const mockResults = {
    data: new Array(20).fill({}),
    totalCount: 100,
    executionTimeMs: 15,
  };

  const defaultProps = {
    results: mockResults,
    currentPage: 1,
    onPageChange: vi.fn(),
    pageSize: 20,
  };

  it('should render showing count and total count', () => {
    const { getByText } = render(<Pagination {...defaultProps} />);
    expect(getByText('Showing 20 of 100')).toBeTruthy();
    expect(getByText('Query took 15ms')).toBeTruthy();
  });

  it('should render correct page information', () => {
    const { getByText } = render(<Pagination {...defaultProps} />);
    expect(getByText('Page 1 of 5')).toBeTruthy();
  });

  it('should disable Prev button on first page', () => {
    const { getByText } = render(<Pagination {...defaultProps} />);
    const prevButton = getByText('Prev') as HTMLButtonElement;
    expect(prevButton.disabled).toBe(true);
  });

  it('should enable Next button if more pages exist', () => {
    const { getByText } = render(<Pagination {...defaultProps} />);
    const nextButton = getByText('Next') as HTMLButtonElement;
    expect(nextButton.disabled).toBe(false);
  });

  it('should call onPageChange when Next is clicked', () => {
    const { getByText } = render(<Pagination {...defaultProps} />);
    const nextButton = getByText('Next');
    fireEvent.click(nextButton);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange when Prev is clicked', () => {
    const props = { ...defaultProps, currentPage: 2 };
    const { getByText } = render(<Pagination {...props} />);
    const prevButton = getByText('Prev');
    fireEvent.click(prevButton);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
  });

  it('should disable Next button on last page', () => {
    const props = { ...defaultProps, currentPage: 5 };
    const { getByText } = render(<Pagination {...props} />);
    const nextButton = getByText('Next') as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });
});
