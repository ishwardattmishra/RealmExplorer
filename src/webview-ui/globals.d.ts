import type { RealmSchemaInfo } from './types';

declare global {
  /** Injected by extension webview HTML before the app bundle loads. */
  // eslint-disable-next-line no-var
  var INITIAL_SCHEMA: RealmSchemaInfo[] | undefined;
  // eslint-disable-next-line no-var
  var INITIAL_TYPE: string | undefined;
  // eslint-disable-next-line no-var
  var LOGO_URI: string | undefined;
}

export {};
