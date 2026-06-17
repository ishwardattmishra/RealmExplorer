import { describe, it, expect } from 'vitest';
import Realm from 'realm';
import * as RealmNs from 'realm';
import type { Realm as RealmType } from 'realm';

describe('Realm Import Compatibility', () => {
  it('should have a functional Realm export', () => {
    // Depending on the Node version, bundler, or typescript esModuleInterop settings,
    // Realm might be the default export or the namespace itself.
    
    // The default import we changed to:
    expect(Realm).toBeDefined();
    
    // Check if it has the .open function, or if it's nested
    const R = (Realm as any).default || Realm;
    
    expect(typeof R.open).toBe('function');
  });

  it('verifies that the default import exposes the open method directly', () => {
    // This is how it is currently used in the codebase after our fix
    // We expect the default import to be the Realm constructor
    expect(typeof (Realm as any).open).toBe('function');
  });
});
