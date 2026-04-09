// dateValidator.js
// Requirements: 11.8

/**
 * Validates a date string in YYYY-MM-DD format.
 * @param {string} str
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDate(str) {
  if (!str || typeof str !== "string") {
    return { valid: false, error: "Date is required" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return { valid: false, error: "Date must be in YYYY-MM-DD format" };
  }

  const [year, month, day] = str.split("-").map(Number);

  if (month < 1 || month > 12) {
    return { valid: false, error: "Month must be between 01 and 12" };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return {
      valid: false,
      error: `Day must be between 01 and ${daysInMonth} for month ${month}`,
    };
  }

  return { valid: true };
}
