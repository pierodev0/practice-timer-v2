import { describe, it, expect, vi, beforeEach } from 'vitest';
import { secToMin } from '../js/export.js';

// ── Mocks ────────────────────────────────────────────────────

// Mock formatISOTime used internally by export.js
vi.mock('../js/utils.js', () => ({
  formatISOTime: vi.fn((iso) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h < 12 ? 'a.m' : 'p.m';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m} ${ampm}`;
  }),
}));

// Mock URL.createObjectURL / revokeObjectURL
beforeEach(() => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  globalThis.URL.revokeObjectURL = vi.fn();
});

// Helper: build a mock ExcelJS stub
function createExcelJSMock() {
  const rows = [];
  let mergeCellsCalls = [];

  const ws = {
    addRow: vi.fn((data) => {
      const row = { number: rows.length + 1, eachCell: vi.fn(function(fn) {}), font: {}, fill: {}, alignment: {} };
      if (data) {
        row.values = Array.isArray(data) ? data : [data];
      }
      rows.push(row);
      return row;
    }),
    mergeCells: vi.fn((range) => { mergeCellsCalls.push(range); }),
    getColumn: vi.fn((i) => ({ width: 10 })),
  };

  const buffer = new ArrayBuffer(8);
  const workbook = {
    creator: '',
    created: null,
    addWorksheet: vi.fn(() => ws),
    xlsx: { writeBuffer: vi.fn(() => Promise.resolve(buffer)) },
  };

  return { workbook, ws, rows, mergeCellsCalls, buffer };
}

// ── secToMin ─────────────────────────────────────────────────

describe('secToMin', () => {
  it('converts 0 seconds to 0 minutes', () => {
    expect(secToMin(0)).toBe(0);
  });

  it('converts 60 seconds to 1 minute', () => {
    expect(secToMin(60)).toBe(1);
  });

  it('rounds 90 seconds to 2 minutes', () => {
    expect(secToMin(90)).toBe(2);
  });

  it('rounds 30 seconds to 1 minute', () => {
    expect(secToMin(30)).toBe(1);
  });

  it('converts null to 0', () => {
    expect(secToMin(null)).toBe(0);
  });

  it('converts undefined to 0', () => {
    expect(secToMin(undefined)).toBe(0);
  });

  it('handles large values', () => {
    expect(secToMin(3600)).toBe(60);
  });
});

// ── downloadDayXLSX ──────────────────────────────────────────

describe('downloadDayXLSX', () => {
  beforeEach(() => {
    // Mock document.createElement for anchor tag
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        return { href: '', download: '', click: vi.fn() };
      }
      return {};
    });
    globalThis.alert = vi.fn();
  });

  it('shows alert if ExcelJS is not loaded', async () => {
    delete globalThis.window.ExcelJS;
    const { downloadDayXLSX } = await import('../js/export.js');
    await downloadDayXLSX([], () => 'Routine', '2026-07-19');
    expect(globalThis.alert).toHaveBeenCalledWith(
      'ExcelJS library not loaded. Please check your internet connection.'
    );
  });

  it('generates a workbook with one sheet for a single day', async () => {
    const mock = createExcelJSMock();
    globalThis.window.ExcelJS = { Workbook: function() { return mock.workbook; } };

    const { downloadDayXLSX } = await import('../js/export.js');
    const sessions = [
      {
        startedAt: new Date(2026, 6, 19, 9, 0).toISOString(),
        completedAt: new Date(2026, 6, 19, 9, 30).toISOString(),
        totalSec: 1800,
        scheduledSec: 1800,
        elapsedSec: 1800,
        exercises: [
          { title: 'Escala', durationSec: 600, bpm: 120, repsCompleted: 1, comment: '' },
        ],
      },
    ];
    await downloadDayXLSX(sessions, (s) => 'Modulo 1', '2026-07-19');

    expect(mock.workbook.addWorksheet).toHaveBeenCalledWith('19-07-2026');
    expect(mock.ws.addRow).toHaveBeenCalled();
    expect(mock.workbook.xlsx.writeBuffer).toHaveBeenCalled();
  });
});

// ── downloadMonthXLSX ────────────────────────────────────────

describe('downloadMonthXLSX', () => {
  beforeEach(() => {
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        return { href: '', download: '', click: vi.fn() };
      }
      return {};
    });
    globalThis.alert = vi.fn();
  });

  it('generates a workbook with multiple day sheets', async () => {
    const mock = createExcelJSMock();
    globalThis.window.ExcelJS = { Workbook: function() { return mock.workbook; } };

    const { downloadMonthXLSX } = await import('../js/export.js');
    const groups = {
      '2026-07-04': [
        {
          startedAt: new Date(2026, 6, 4, 10, 0).toISOString(),
          completedAt: new Date(2026, 6, 4, 10, 45).toISOString(),
          totalSec: 2700,
          scheduledSec: 2700,
          elapsedSec: 2700,
          exercises: [],
        },
      ],
      '2026-07-05': [
        {
          startedAt: new Date(2026, 6, 5, 11, 0).toISOString(),
          completedAt: new Date(2026, 6, 5, 11, 30).toISOString(),
          totalSec: 1800,
          scheduledSec: 1800,
          elapsedSec: 1800,
          exercises: [],
        },
      ],
    };

    await downloadMonthXLSX(groups, (s) => 'Modulo 1', 2026, 6, 'Julio 2026');

    // One sheet per day in the group (July has 2 days)
    expect(mock.workbook.addWorksheet).toHaveBeenCalledTimes(2);
    expect(mock.workbook.addWorksheet).toHaveBeenCalledWith('4 Julio');
    expect(mock.workbook.addWorksheet).toHaveBeenCalledWith('5 Julio');
    expect(mock.workbook.xlsx.writeBuffer).toHaveBeenCalled();
  });

  it('shows alert if ExcelJS is not loaded', async () => {
    delete globalThis.window.ExcelJS;
    const { downloadMonthXLSX } = await import('../js/export.js');
    await downloadMonthXLSX({}, () => 'Routine', 2026, 6, 'Julio 2026');
    expect(globalThis.alert).toHaveBeenCalledWith(
      'ExcelJS library not loaded. Please check your internet connection.'
    );
  });
});
