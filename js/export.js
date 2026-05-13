/**
 * Export utilities for routine session data.
 * Uses ExcelJS (CDN: window.ExcelJS) to generate .xlsx files.
 *
 * When SheetJS / xlsx is needed in the future, add it here.
 */

import { formatISOTime } from './utils.js';

/**
 * Convert seconds to whole minutes (rounded).
 */
export function secToMin(sec) {
  return Math.round((sec || 0) / 60);
}

/**
 * Style a worksheet header row (bold, colored background, borders).
 */
function styleHeaderRow(row) {
  row.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE53935' } };
  row.alignment = { horizontal: 'center' };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });
}

/**
 * Apply thin borders and vertical alignment to every cell in a row.
 */
function styleDataRow(row) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    };
    cell.alignment = { vertical: 'middle' };
  });
}

/** Spanish month names (for sheet naming). */
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/** Column definitions used by all export functions. */
const COLUMNS = [
  { header: 'Titulo', width: 40 },
  { header: 'Reps', width: 8 },
  { header: 'Bpm', width: 8 },
  { header: 'duracion', width: 10 },
  { header: 'Series', width: 8 },
  { header: 'total', width: 10 },
  { header: 'notas', width: 45 }
];

/**
 * Write all sessions for a single day into a worksheet.
 * Routines are stacked vertically with title rows, headers, and exercise data.
 */
function writeSessionSheet(ws, daySessions, resolveRoutineName) {
  daySessions.forEach((session, idx) => {
    if (idx > 0) {
      ws.addRow([]);
      ws.addRow([]);
    }

    const routineName = resolveRoutineName(session);
    const totalMin = secToMin(session.totalSec);
    const scheduledMin = secToMin(session.scheduledSec);
    const elapsedMin = secToMin(session.elapsedSec);

    // Format: Rutina 1: Modulo 1 (20 min) - 12:03 a.m / 12:25 a.m (22 min)
    const startStr = formatISOTime(session.startedAt);
    const endStr = formatISOTime(session.completedAt);
    const titleStr = `Rutina ${idx + 1}: ${routineName} (${scheduledMin} min) - ${startStr} / ${endStr} (${elapsedMin} min)`;
    const titleRow = ws.addRow([titleStr]);
    titleRow.font = { bold: true, size: 13, color: { argb: 'FFE53935' } };
    ws.mergeCells(`A${titleRow.number}:G${titleRow.number}`);

    // --- Column headers ---
    const headerRow = ws.addRow(COLUMNS.map(c => c.header));
    styleHeaderRow(headerRow);

    // --- Exercise rows ---
    (session.exercises || []).forEach((ex, exIdx) => {
      const durMin = secToMin(ex.durationSec);
      const reps = Number(ex.repsCompleted) || 1;
      const row = ws.addRow([
        ex.title || '',
        reps,
        ex.bpm ?? '',
        durMin,
        reps,
        reps * durMin,
        ex.comment || ''
      ]);
      if (exIdx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        });
      }
      styleDataRow(row);
    });
  });

  COLUMNS.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });
}

/**
 * Export one day's sessions as an .xlsx file.
 * Creates a SINGLE sheet named with the date, with all routines stacked.
 *
 * @param {Array}   daySessions        - Sessions filtered to one date
 * @param {Function} resolveRoutineName - (session) => string
 * @param {string}   dateStr           - YYYY-MM-DD
 */
export async function downloadDayXLSX(daySessions, resolveRoutineName, dateStr) {
  const ExcelJS = window.ExcelJS;
  if (!ExcelJS) {
    alert('ExcelJS library not loaded. Please check your internet connection.');
    return;
  }

  const [y, m, d] = dateStr.split('-');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Practice Timer';
  workbook.created = new Date();

  const ws = workbook.addWorksheet(`${d}-${m}-${y}`);
  writeSessionSheet(ws, daySessions, resolveRoutineName);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `practica_${d}-${m}-${y}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Export all sessions for a full month as an .xlsx file.
 * Each day gets its own sheet, named by day number + month (e.g. "4 Mayo").
 *
 * @param {Object}   monthDayGroups    - { "YYYY-MM-DD": [session, ...], ... }
 * @param {Function} resolveRoutineName - (session) => string
 * @param {number}   year
 * @param {number}   month              - 0-indexed (0 = January)
 * @param {string}   monthLabel         - e.g. "Mayo 2026" (used in filename)
 */
export async function downloadMonthXLSX(monthDayGroups, resolveRoutineName, year, month, monthLabel) {
  const ExcelJS = window.ExcelJS;
  if (!ExcelJS) {
    alert('ExcelJS library not loaded. Please check your internet connection.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Practice Timer';
  workbook.created = new Date();

  const sortedDays = Object.keys(monthDayGroups).sort();

  sortedDays.forEach(dateStr => {
    const [y, m, d] = dateStr.split('-');
    const dayNum = parseInt(d, 10);
    const sheetName = `${dayNum} ${MONTHS_ES[parseInt(m, 10) - 1]}`; // e.g. "4 Mayo"
    const ws = workbook.addWorksheet(sheetName);
    writeSessionSheet(ws, monthDayGroups[dateStr], resolveRoutineName);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `practica_${monthLabel.replace(/\s/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
