import { render } from '@testing-library/preact';
import { TypeIcon } from './TypeIcon';
import { describe, it, expect } from 'vitest';
import { h } from 'preact';

describe('TypeIcon', () => {
  const types = [
    { type: 'int', icon: '🔢' },
    { type: 'string', icon: 'abc' },
    { type: 'bool', icon: '✔' },
    { type: 'date', icon: '📅' },
    { type: 'decimal128', icon: '💰' },
    { type: 'data', icon: '📦' },
    { type: 'uuid', icon: '🪪' },
    { type: 'objectid', icon: '🆔' },
    { type: 'mixed', icon: '🌈' },
    { type: 'dictionary', icon: '📖' },
    { type: 'set', icon: '⬢' },
    { type: 'list', icon: '[]' },
    { type: 'object', icon: '{}' },
    { type: 'unknown', icon: '📄' }
  ];

  types.forEach(({ type, icon }) => {
    it(`should render ${icon} for type ${type}`, () => {
      const { getByText } = render(<TypeIcon type={type} />);
      expect(getByText(icon)).toBeTruthy();
    });
  });
});
