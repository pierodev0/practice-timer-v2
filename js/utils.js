import { nanoid } from 'nanoid';
import { format } from 'date-fns';

/**
 * Pure utility functions — no DOM, no state, no side effects.
 */

/**
 * Format seconds into MM:SS display string.
 */
export function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

/**
 * Extract first URL from a text string.
 */
export function getFirstUrl(text) {
  return (text.match(/(https?:\/\/[^\s]+)/i) || [])[0];
}

/**
 * Extract first image URL from a text string.
 */
export function getFirstImage(text) {
  return (text.match(/(https?:\/\/[^\s]*\.(?:png|jpg|jpeg|gif|webp|svg)[^\s]*)/i) || [])[0];
}

/**
 * Generate a consistent color from a string (for chart datasets).
 */
export function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return '#' + "00000".substring(0, 6 - (hash & 0x00FFFFFF).toString(16).toUpperCase().length) + (hash & 0x00FFFFFF).toString(16).toUpperCase();
}

/**
 * Trigger a file download in the browser.
 */
export function downloadJSON(content, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Sanitize an imported routine (ensure all fields exist).
 */
export function sanitizeImportedRoutine(r) {
  return {
    id: nanoid(),
    name: r.name + " (Import)",
    exercises: (r.exercises || []).map(ex => ({
      id: nanoid(),
      title: ex.title || "Untitled",
      bpm: ex.bpm || 100,
      durationSec: ex.durationSec || 60,
      remainingSec: ex.durationSec || 60,
      completed: false,
      autoStart: ex.autoStart ?? true,
      archived: !!ex.archived,
      reps: ex.reps || 1,
      currentRep: 1,
      comment: ex.comment || "",
      statisticName: ex.statisticName || null,
      statisticLogs: ex.statisticLogs || []
    }))
  };
}

/**
 * Create today's date string in YYYY-MM-DD format.
 */
export function formatDate(date) {
  return format(date, 'yyyy-MM-dd');
}

export function todayStr() {
  return formatDate(new Date());
}

/**
 * Simple deep clone via JSON (safe for serializable data).
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Format an ISO datetime string to "h:mm a.m/p.m" (e.g. "12:03 a.m").
 */
export function formatISOTime(isoStr) {
  if (!isoStr) return '--:--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '--:--';
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? 'a.m' : 'p.m';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
