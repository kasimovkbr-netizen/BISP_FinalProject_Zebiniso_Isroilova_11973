// errorHandler.js
// Requirements: 12.1, 12.3, 12.4

/**
 * Converts a Supabase error object into a user-friendly message.
 * Does not expose raw error codes, stack traces, or internal identifiers.
 * @param {object} error - Supabase error object
 * @returns {string}
 */
export function handleSupabaseError(error) {
  if (!error) return "Something went wrong. Please try again.";

  // RLS / permission denied
  if (error.status === 403 || error.code === "PGRST301") {
    return "Access denied. You do not have permission to perform this action.";
  }

  // Not found
  if (error.status === 404 || error.code === "PGRST116") {
    return "The requested data was not found.";
  }

  // Auth errors
  if (error.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  // Network / connection errors
  if (
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("fetch") ||
    error.message?.toLowerCase().includes("failed to fetch")
  ) {
    return "Connection error. Please check your internet connection.";
  }

  // Unique constraint violation
  if (error.code === "23505") {
    return "This record already exists.";
  }

  // Generic fallback — never expose raw codes
  return "Something went wrong. Please try again.";
}
