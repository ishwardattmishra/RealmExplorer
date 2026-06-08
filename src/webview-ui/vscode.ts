export interface VsCodeApi {
  postMessage(message: unknown): void;
  getState?(): unknown;
  setState?(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

/**
 * Handle environments where acquireVsCodeApi is not available (e.g. Vitest/Unit tests)
 */
function getVsCodeApi(): VsCodeApi {
  if (typeof acquireVsCodeApi === 'function') {
    return acquireVsCodeApi();
  }
  
  // Return a no-op implementation for testing environments
  return {
    postMessage: () => {},
    getState: () => ({}),
    setState: () => {},
  };
}

export const vscode: VsCodeApi = getVsCodeApi();
