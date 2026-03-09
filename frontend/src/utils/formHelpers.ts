import type { AxiosError } from 'axios';
import type { ZodError } from 'zod';

/** Map of per-field validation error messages keyed by field name. */
export type FieldErrors = Partial<Record<string, string>>;

/**
 * Resolves a caught error from an API call into a human-readable string.
 * Maps common API error codes to friendly messages; falls back to a generic one.
 *
 * @example
 * } catch (err) {
 *   setModalError(resolveError(err));
 * }
 */
export function resolveError(err: unknown): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const apiErr = e.response?.data?.error;
  const code = apiErr?.code;
  switch (code) {
    case 'FORBIDDEN':
      return apiErr?.message ?? 'You do not have permission to perform this action.';
    case 'NOT_FOUND':
      return apiErr?.message ?? 'The requested resource was not found.';
    case 'VALIDATION_ERROR':
      return apiErr?.message ?? 'Validation failed. Please check your input.';
    case 'CONFLICT':
      return apiErr?.message ?? 'This record already exists.';
    default:
      return apiErr?.message ?? 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Extracts per-field error messages from a ZodError.
 * Returns an object mapping field names to their first error message.
 *
 * @example
 * } catch (err) {
 *   if (err instanceof ZodError) setFieldErrors(zodFieldErrors(err));
 * }
 */
export function zodFieldErrors(err: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const field = issue.path[0] as string | undefined;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}
