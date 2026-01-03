/**
 * Centralized error logging utility for consistent error handling across the application.
 * All errors should be surfaced through this module for visibility.
 */

type ErrorCategory = 'audio' | 'persistence' | 'render' | 'engine' | 'network' | 'unknown';

interface ErrorContext {
  category: ErrorCategory;
  operation: string;
  details?: Record<string, unknown>;
}

/**
 * Array of recent errors for debugging (capped to last 50).
 */
const errorLog: Array<{ timestamp: Date; context: ErrorContext; error: unknown }> = [];
const MAX_ERROR_LOG_SIZE = 50;

/**
 * Optional callback for external error monitoring/reporting.
 */
let onErrorCallback: ((context: ErrorContext, error: unknown) => void) | null = null;

/**
 * Set a callback to be notified of all errors (for external monitoring).
 */
export const setErrorCallback = (
  callback: ((context: ErrorContext, error: unknown) => void) | null,
): void => {
  onErrorCallback = callback;
};

/**
 * Log an error with context. All errors are:
 * 1. Logged to console with context
 * 2. Stored in internal error log for debugging
 * 3. Forwarded to any registered callback
 *
 * @param context - Description of where/what operation failed
 * @param error - The caught error
 * @param silent - If true, don't log to console (still records internally)
 */
export const logError = (context: ErrorContext, error: unknown, silent = false): void => {
  // Store in error log
  errorLog.push({ timestamp: new Date(), context, error });
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift();
  }

  // Console output
  if (!silent) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[${context.category.toUpperCase()}] ${context.operation}: ${errorMessage}`,
      context.details ?? '',
      error,
    );
  }

  // Forward to external monitoring
  onErrorCallback?.(context, error);
};

/**
 * Get recent errors for debugging.
 */
export const getRecentErrors = (): ReadonlyArray<{
  timestamp: Date;
  context: ErrorContext;
  error: unknown;
}> => [...errorLog];

/**
 * Clear the error log.
 */
export const clearErrorLog = (): void => {
  errorLog.length = 0;
};

/**
 * Helper for audio-related errors.
 */
export const logAudioError = (operation: string, error: unknown): void => {
  logError({ category: 'audio', operation }, error);
};

/**
 * Helper for persistence-related errors.
 */
export const logPersistenceError = (operation: string, error: unknown): void => {
  logError({ category: 'persistence', operation }, error);
};

/**
 * Helper for render-related errors.
 */
export const logRenderError = (operation: string, error: unknown): void => {
  logError({ category: 'render', operation }, error);
};
