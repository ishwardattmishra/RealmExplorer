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
  
  // Return a mock implementation for testing environments
  return {
    postMessage: (msg: unknown) => {
      console.log('Mock postMessage:', msg);
    },
    getState: () => ({}),
    setState: (state: unknown) => {
      console.log('Mock setState:', state);
    },
  };
}

export const vscode: VsCodeApi = getVsCodeApi();
