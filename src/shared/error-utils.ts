export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      return `${err.message} [caused by: ${cause.message}]`;
    }
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return String(err) || 'Unknown error';
}
