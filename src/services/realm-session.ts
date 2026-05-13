import realmPkg from 'realm';
const { Realm } = realmPkg;

/**
 * Owns Realm open/close lifecycle and the active Realm instance.
 */
export class RealmSession {
  private realm: Realm | null = null;

  async open(filePath: string, readOnly: boolean): Promise<void> {
    this.close();
    this.realm = await Realm.open({
      path: filePath,
      readOnly,
    });
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
