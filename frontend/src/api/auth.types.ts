/**
 * Shared auth types — mirrors the backend UserRole enum.
 * Kept in one place so both auth.api.ts and AuthContext.tsx import from here.
 */
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
