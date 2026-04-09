// Feature: vaccination-tracker
// Core vaccination logic utilities
// Requirements: 5.1, 7.1, 7.2, 7.3, 7.4, 10.2

/**
 * Computes the scheduled date for a vaccine given a birth date and offset in days.
 * @param {Date|string} birthDate - The child's birth date
 * @param {number} offsetDays - Number of days after birth
 * @returns {string} ISO date string "YYYY-MM-DD"
 */
export function computeScheduledDate(birthDate, offsetDays) {
  const date = new Date(birthDate);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

/**
 * Derives the status of a vaccination record.
 * @param {string} scheduledDate - ISO date string "YYYY-MM-DD"
 * @param {string|null} takenDate - ISO date string or null
 * @param {string} today - ISO date string "YYYY-MM-DD" representing today
 * @returns {"taken"|"overdue"|"pending"}
 */
export function deriveStatus(scheduledDate, takenDate, today) {
  if (takenDate != null) return "taken";
  if (scheduledDate < today) return "overdue";
  return "pending";
}

/**
 * Applies relative scheduling: shifts only the immediately next pending record's
 * scheduledDate when a vaccine is taken late.
 *
 * Formula: nextScheduledDate = takenDate + (nextOffsetDays - currentOffsetDays)
 *
 * Rules:
 * - Only updates the first record after currentIdx with status == "pending"
 * - If takenDate <= scheduledDate of current record, does NOT shift anything
 * - Returns a new array (immutable)
 *
 * @param {Array<{vaccineName: string, scheduledDate: string, takenDate: string|null, status: string, offsetDays: number}>} records
 * @param {number} currentIdx - Index of the record just taken
 * @param {string} takenDate - ISO date string "YYYY-MM-DD"
 * @returns {Array} Updated records array (new array, original unchanged)
 */
export function applyRelativeScheduling(records, currentIdx, takenDate) {
  const currentRecord = records[currentIdx];

  // If taken on time or early, do not shift anything
  if (takenDate <= currentRecord.scheduledDate) {
    return records.slice();
  }

  const updated = records.slice();

  // Find the first pending record after currentIdx
  for (let i = currentIdx + 1; i < updated.length; i++) {
    if (updated[i].status === "pending") {
      const nextOffsetDays = updated[i].offsetDays;
      const currentOffsetDays = currentRecord.offsetDays;

      // Compute new scheduled date: takenDate + (nextOffsetDays - currentOffsetDays)
      const takenDateObj = new Date(takenDate);
      takenDateObj.setDate(
        takenDateObj.getDate() + (nextOffsetDays - currentOffsetDays),
      );
      const newScheduledDate = takenDateObj.toISOString().split("T")[0];

      updated[i] = { ...updated[i], scheduledDate: newScheduledDate };
      break; // Only shift the immediately next pending record
    }
  }

  return updated;
}
