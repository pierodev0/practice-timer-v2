import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatTime,
  getFirstUrl,
  getFirstImage,
  stringToColor,
  sanitizeImportedRoutine,
  formatDate,
  todayStr,
  deepClone,
  formatISOTime,
} from '../js/utils.js';

// ── formatTime ─────────────────────────────────────────────

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under 60', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats exactly 1 minute', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('2:05');
  });

  it('formats large values', () => {
    expect(formatTime(3661)).toBe('61:01');
  });

  it('pads seconds with leading zero', () => {
    expect(formatTime(63)).toBe('1:03');
  });
});

// ── getFirstUrl ────────────────────────────────────────────

describe('getFirstUrl', () => {
  it('extracts http URL', () => {
    expect(getFirstUrl('visit http://example.com now')).toBe('http://example.com');
  });

  it('extracts https URL', () => {
    expect(getFirstUrl('check https://docs.example.com/page')).toBe('https://docs.example.com/page');
  });

  it('returns undefined for plain text', () => {
    expect(getFirstUrl('no links here')).toBeUndefined();
  });

  it('extracts first URL when multiple exist', () => {
    expect(getFirstUrl('first https://first.com and second https://second.com')).toBe('https://first.com');
  });

  it('handles empty string', () => {
    expect(getFirstUrl('')).toBeUndefined();
  });
});

// ── getFirstImage ──────────────────────────────────────────

describe('getFirstImage', () => {
  it('extracts .png URL', () => {
    expect(getFirstImage('img https://example.com/image.png')).toBe('https://example.com/image.png');
  });

  it('extracts .jpg URL', () => {
    expect(getFirstImage('img https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
  });

  it('extracts .jpeg URL', () => {
    expect(getFirstImage('img https://example.com/photo.jpeg')).toBe('https://example.com/photo.jpeg');
  });

  it('extracts .gif URL', () => {
    expect(getFirstImage('img https://example.com/animated.gif')).toBe('https://example.com/animated.gif');
  });

  it('extracts .webp URL', () => {
    expect(getFirstImage('img https://example.com/image.webp')).toBe('https://example.com/image.webp');
  });

  it('extracts .svg URL', () => {
    expect(getFirstImage('img https://example.com/icon.svg')).toBe('https://example.com/icon.svg');
  });

  it('ignores non-image URLs', () => {
    expect(getFirstImage('visit https://example.com/page.html')).toBeUndefined();
  });

  it('handles mixed content with image', () => {
    const text = 'notes https://example.com/page then https://example.com/img.png';
    expect(getFirstImage(text)).toBe('https://example.com/img.png');
  });

  it('handles empty string', () => {
    expect(getFirstImage('')).toBeUndefined();
  });
});

// ── stringToColor ──────────────────────────────────────────

describe('stringToColor', () => {
  it('returns a hex color string', () => {
    const color = stringToColor('test');
    expect(color).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('returns consistent colors for same input', () => {
    expect(stringToColor('Routine A')).toBe(stringToColor('Routine A'));
  });

  it('returns different colors for different inputs', () => {
    expect(stringToColor('Routine A')).not.toBe(stringToColor('Routine B'));
  });

  it('handles empty string', () => {
    const color = stringToColor('');
    expect(color).toMatch(/^#[0-9A-F]{6}$/);
  });
});

// ── formatDate ─────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a date to YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 6, 19))).toBe('2026-07-19');
  });

  it('pads month and day with zeros', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

// ── todayStr ───────────────────────────────────────────────

describe('todayStr', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = todayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── deepClone ──────────────────────────────────────────────

describe('deepClone', () => {
  it('clones a simple object', () => {
    const obj = { a: 1, b: 'hello' };
    const clone = deepClone(obj);
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
  });

  it('clones nested objects', () => {
    const obj = { a: { b: [1, 2, { c: 3 }] } };
    const clone = deepClone(obj);
    expect(clone).toEqual(obj);
    expect(clone.a).not.toBe(obj.a);
    expect(clone.a.b).not.toBe(obj.a.b);
  });

  it('clones arrays', () => {
    const arr = [1, { x: 2 }, [3]];
    const clone = deepClone(arr);
    expect(clone).toEqual(arr);
    expect(clone).not.toBe(arr);
  });

  it('handles null', () => {
    expect(deepClone(null)).toBeNull();
  });

  it('handles primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
  });
});

// ── formatISOTime ──────────────────────────────────────────

describe('formatISOTime', () => {
  it('formats morning time', () => {
    const iso = new Date(2026, 6, 19, 9, 5).toISOString();
    expect(formatISOTime(iso)).toBe('9:05 a.m');
  });

  it('formats afternoon time', () => {
    const iso = new Date(2026, 6, 19, 14, 30).toISOString();
    expect(formatISOTime(iso)).toBe('2:30 p.m');
  });

  it('formats midnight as 12:00 a.m', () => {
    const iso = new Date(2026, 6, 19, 0, 0).toISOString();
    expect(formatISOTime(iso)).toBe('12:00 a.m');
  });

  it('formats noon as 12:00 p.m', () => {
    const iso = new Date(2026, 6, 19, 12, 0).toISOString();
    expect(formatISOTime(iso)).toBe('12:00 p.m');
  });

  it('returns --:-- for null input', () => {
    expect(formatISOTime(null)).toBe('--:--');
  });

  it('returns --:-- for undefined', () => {
    expect(formatISOTime(undefined)).toBe('--:--');
  });

  it('pads minutes with leading zero', () => {
    const iso = new Date(2026, 6, 19, 8, 3).toISOString();
    expect(formatISOTime(iso)).toBe('8:03 a.m');
  });
});

// ── sanitizeImportedRoutine ────────────────────────────────

describe('sanitizeImportedRoutine', () => {
  it('creates a valid routine from minimal input', () => {
    const result = sanitizeImportedRoutine({ name: 'Test' });
    expect(result).toMatchObject({
      name: 'Test (Import)',
    });
    expect(result.id).toBeDefined();
    expect(result.exercises).toEqual([]);
  });

  it('normalizes exercises with defaults', () => {
    const result = sanitizeImportedRoutine({
      name: 'R1',
      exercises: [
        { title: 'Ex1', durationSec: 120, bpm: 100 },
      ],
    });
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0]).toMatchObject({
      title: 'Ex1',
      durationSec: 120,
      bpm: 100,
      remainingSec: 120,
      completed: false,
      autoStart: true,
      archived: false,
      reps: 1,
      currentRep: 1,
      comment: '',
      statisticName: null,
      statisticLogs: [],
    });
    expect(result.exercises[0].id).toBeDefined();
  });

  it('falls back to defaults for missing fields', () => {
    const result = sanitizeImportedRoutine({
      name: 'Empty',
      exercises: [{ title: null }],
    });
    expect(result.exercises[0].bpm).toBe(100);
    expect(result.exercises[0].durationSec).toBe(60);
    expect(result.exercises[0].title).toBe('Untitled');
  });

  it('preserves archived flag', () => {
    const result = sanitizeImportedRoutine({
      name: 'R1',
      exercises: [{ archived: true }],
    });
    expect(result.exercises[0].archived).toBe(true);
  });
});
