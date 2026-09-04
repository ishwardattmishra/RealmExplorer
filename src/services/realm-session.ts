import Realm from 'realm';

/**
 * Owns Realm open/close lifecycle and the active Realm instance.
 */
export class RealmSession {
  private realm: Realm | null = null;

  async open(filePath: string, readOnly: boolean, encryptionKey?: ArrayBuffer): Promise<void> {
    this.close();
    const RealmModule = (Realm as any).default || Realm;
    
    const config: Realm.Configuration = {
      path: filePath,
      readOnly,
    };
    
    if (encryptionKey) {
      config.encryptionKey = new Uint8Array(encryptionKey);
    }
    
    this.realm = await RealmModule.open(config);
  }

  getRealmOrThrow(): Realm {
    if (!this.realm || this.realm.isClosed) {
      throw new Error('Realm is not open or has been closed.');
    }
    return this.realm;
  }

  close(): void {
    if (this.realm && !this.realm.isClosed) {
      try {
        this.realm.close();
      } finally {
        this.realm = null;
      }
    } else {
      this.realm = null;
    }
  }

  isOpen(): boolean {
    return !!this.realm && !this.realm.isClosed;
  }
}
