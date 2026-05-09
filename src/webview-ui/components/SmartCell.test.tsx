import { render } from '@testing-library/preact';
import { SmartCell } from './SmartCell';
import { describe, it, expect, vi } from 'vitest';
// Mock TypeIcon to avoid rendering issues
vi.mock('./TypeIcon', () => ({
  TypeIcon: ({ type }: { type: string }) => <span data-testid="type-icon">{type}</span>
}));

describe('SmartCell', () => {
  it('should render null for null or undefined values', () => {
    const { getByText } = render(<SmartCell value={null} />);
    expect(getByText('null')).toBeTruthy();
    expect(getByText('null').tagName).toBe('EM');
  });

  it('should render binary placeholder for ArrayBuffer', () => {
    const buffer = new ArrayBuffer(8);
    const { getByText } = render(<SmartCell value={buffer} />);
    expect(getByText('<Binary 8 bytes>')).toBeTruthy();
  });

  it('should handle Decimal128 values', () => {
    const decimal = { $numberDecimal: '123.45' };
    const { getByText } = render(<SmartCell value={decimal} />);
    expect(getByText('123.45')).toBeTruthy();
  });

  it('should render stringified objects', () => {
    const obj = { foo: 'bar' };
    const { getByText } = render(<SmartCell value={obj} />);
    expect(getByText('{"foo":"bar"}')).toBeTruthy();
  });

  it('should truncate long stringified objects', () => {
    const obj = { long: 'a'.repeat(60) };
    const { getByText } = render(<SmartCell value={obj} />);
    expect(getByText(/.../)).toBeTruthy();
  });

  it('should render basic types as strings', () => {
    const { getByText: getByTextStr } = render(<SmartCell value="hello" />);
    expect(getByTextStr('hello')).toBeTruthy();

    const { getByText: getByTextNum } = render(<SmartCell value={42} />);
    expect(getByTextNum('42')).toBeTruthy();
  });

  it('should render TypeIcon if typeInfo is provided', () => {
    const typeInfo = { name: 'age', type: 'int' };
    const { getByTestId } = render(<SmartCell value={25} typeInfo={typeInfo} />);
    expect(getByTestId('type-icon')).toBeTruthy();
    expect(getByTestId('type-icon').textContent).toBe('int');
  });
});
