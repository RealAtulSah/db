/**
 * export-manager.js - CSV, JSON, and Excel export functionality
 */
const ExportManager = (() => {

  /**
   * Export data to CSV.
   * @param {{ columns: string[], rows: any[][] }} data
   * @param {string} filename
   * @param {{ bom?: boolean }} options
   */
  function exportCSV(data, filename, options = {}) {
    const { columns, rows } = data;
    const lines = [];

    // Header
    lines.push(columns.map(c => csvQuote(c)).join(','));

    // Data rows
    for (const row of rows) {
      const cells = row.map((val, i) => {
        if (val === null || val === undefined) return '';
        if (val instanceof Uint8Array || val instanceof ArrayBuffer) return '[BLOB]';
        return csvQuote(String(val));
      });
      lines.push(cells.join(','));
    }

    let content = lines.join('\r\n') + '\r\n';

    // Add BOM for UTF-8 compatibility
    const bom = options.bom !== false ? '\uFEFF' : '';
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  }

  /**
   * Properly quote a CSV field.
   */
  function csvQuote(val) {
    const str = String(val);
    // Must quote if contains comma, double-quote, newline, or leading/trailing whitespace
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')
        || str !== str.trim()) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Export data to JSON.
   * @param {{ columns: string[], rows: any[][] }} data
   * @param {string} filename
   * @param {{ pretty?: boolean }} options
   */
  function exportJSON(data, filename, options = {}) {
    const { columns, rows } = data;
    const objects = rows.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        let val = row[i];
        if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
          // Convert binary to base64
          val = { _type: 'BLOB', _encoding: 'base64', _value: uint8ToBase64(val) };
        }
        // Preserve large integers as strings if needed
        if (typeof val === 'number' && !Number.isSafeInteger(val) && Number.isInteger(val)) {
          val = String(val);
        }
        obj[col] = val;
      });
      return obj;
    });

    const indent = options.pretty !== false ? 2 : 0;
    const json = JSON.stringify(objects, null, indent);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
  }

  /**
   * Export data to a formatted Excel workbook.
   * @param {{ columns: string[], rows: any[][] }} data
   * @param {string} sheetName
   * @param {string} filename
   */
  function exportExcel(data, sheetName, filename) {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS (XLSX) library is not loaded.');
    }

    const wb = XLSX.utils.book_new();
    addSheetToWorkbook(wb, data, sanitizeSheetName(sheetName));

    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }

  /**
   * Export multiple tables to a single Excel workbook.
   * @param {Array<{ name: string, data: { columns: string[], rows: any[][] } }>} tables
   * @param {string} filename
   * @param {{ includeSummary?: boolean }} options
   */
  function exportMultiTableExcel(tables, filename, options = {}) {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS (XLSX) library is not loaded.');
    }

    const wb = XLSX.utils.book_new();
    const usedNames = new Set();

    // Optional summary sheet
    if (options.includeSummary) {
      const summaryData = {
        columns: ['Table Name', 'Columns', 'Rows'],
        rows: tables.map(t => [t.name, t.data.columns.length, t.data.rows.length])
      };
      addSheetToWorkbook(wb, summaryData, 'Summary');
      usedNames.add('Summary');
    }

    for (const table of tables) {
      let name = sanitizeSheetName(table.name);
      // Handle duplicate names
      if (usedNames.has(name)) {
        let counter = 2;
        while (usedNames.has(`${name}_${counter}`)) counter++;
        name = `${name}_${counter}`;
      }
      usedNames.add(name);
      addSheetToWorkbook(wb, table.data, name);
    }

    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }

  /**
   * Add a formatted sheet to a workbook.
   */
  function addSheetToWorkbook(wb, data, sheetName) {
    const { columns, rows } = data;

    // Build array of arrays with header
    const aoa = [columns, ...rows.map(row => row.map(cell => {
      if (cell instanceof Uint8Array || cell instanceof ArrayBuffer) return '[BLOB]';
      // Prevent formula injection
      if (typeof cell === 'string' && cell.length > 0) {
        const first = cell.charAt(0);
        if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r') {
          return "'" + cell; // prefix with apostrophe to prevent formula execution
        }
      }
      return cell;
    }))];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths - auto-fit based on content
    const colWidths = columns.map((col, i) => {
      let maxLen = col.length;
      for (let r = 0; r < Math.min(rows.length, 100); r++) {
        const val = rows[r][i];
        const len = val !== null && val !== undefined ? String(val).length : 4;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen + 2, 8), 50) };
    });
    ws['!cols'] = colWidths;

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Auto filter
    if (columns.length > 0 && rows.length > 0) {
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: columns.length - 1 } }) };
    }

    // Style header cells
    for (let c = 0; c < columns.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, color: { rgb: '111111' } },
        fill: { fgColor: { rgb: 'FFD600' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          bottom: { style: 'thin', color: { rgb: 'E5E5E5' } }
        }
      };
    }

    // Alternating row shading
    for (let r = 1; r <= rows.length; r++) {
      if (r % 2 === 0) {
        for (let c = 0; c < columns.length; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (!ws[addr]) ws[addr] = { v: '', t: 's' };
          ws[addr].s = {
            ...(ws[addr].s || {}),
            fill: { fgColor: { rgb: 'F7F7F5' } }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  /**
   * Sanitize a worksheet name for Excel.
   * Max 31 chars, no [ ] * ? / \
   */
  function sanitizeSheetName(name) {
    let clean = name.replace(/[[\]*?/\\:]/g, '_');
    if (clean.length > 31) clean = clean.substring(0, 31);
    if (clean.length === 0) clean = 'Sheet';
    return clean;
  }

  /**
   * Download a modified database file.
   */
  function downloadDatabase(dbBytes, filename) {
    const blob = new Blob([dbBytes], { type: 'application/x-sqlite3' });
    const name = filename.replace(/(\.\w+)$/, '_modified$1');
    downloadBlob(blob, name);
  }

  // --- Utility ---

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 200);
  }

  function uint8ToBase64(uint8) {
    const arr = uint8 instanceof Uint8Array ? uint8 : new Uint8Array(uint8);
    let binary = '';
    for (let i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  }

  return {
    exportCSV,
    exportJSON,
    exportExcel,
    exportMultiTableExcel,
    downloadDatabase,
    downloadBlob
  };
})();
