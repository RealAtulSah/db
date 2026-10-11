/**
 * table-view.js - Data grid rendering, pagination, sorting, inline actions
 */
const TableView = (() => {
  let currentTable = '';
  let currentPage = 1;
  let pageSize = 50;
  let totalRows = 0;
  let sortColumn = null;
  let sortDir = 'ASC';
  let searchText = '';
  let columns = [];
  let tableData = { columns: [], rows: [], total: 0 };

  const SVG = {
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    chevLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    sortAsc: '▲',
    sortDesc: '▼',
    sortNone: '⇅'
  };

  /**
   * Load and display a table.
   */
  function loadTable(tableName) {
    currentTable = tableName;
    currentPage = 1;
    sortColumn = null;
    sortDir = 'ASC';
    searchText = '';
    columns = Database.getTableInfo(tableName);
    refresh();
  }

  /**
   * Refresh data with current params.
   */
  function refresh() {
    if (!currentTable) return;

    const textColumns = columns
      .filter(c => {
        const t = c.type.toUpperCase();
        return !t.includes('BLOB');
      })
      .map(c => c.name);

    const activeFilters = SearchFilter.getActiveFilters();

    tableData = Database.queryTable(currentTable, {
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      orderBy: sortColumn,
      orderDir: sortDir,
      search: searchText,
      searchColumns: textColumns,
      filters: activeFilters
    });

    totalRows = tableData.total;
    render();
    App.updateStatusBar();
  }

  function render() {
    const container = document.getElementById('main-content');
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const rowCount = Database.getRowCount(currentTable);
    const tableSQL = Database.getTableSQL(currentTable);

    let html = `
      <div class="section-header">
        <div class="section-header__icon section-header__icon--dark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        </div>
        <div>
          <div class="section-header__title text-mono">${escapeHTML(currentTable)}</div>
          <div class="section-header__subtitle">${columns.length} column${columns.length !== 1 ? 's' : ''} · ${totalRows.toLocaleString()} record${totalRows !== 1 ? 's' : ''}</div>
        </div>
        <div class="section-header__actions">
          <button class="btn btn--primary btn--sm" id="btn-add-record" aria-label="Add new record">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Record
          </button>
          <button class="btn btn--ghost btn--sm" id="btn-export-table" aria-label="Export table">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button class="btn btn--ghost btn--sm" id="btn-refresh-table" aria-label="Refresh table">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button class="btn btn--ghost btn--sm" id="btn-schema-info" aria-label="Show schema">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
        </div>
      </div>

      <div class="data-grid-wrapper">
        <div class="data-grid-toolbar">
          <div class="data-grid-toolbar__search">
            ${SVG.search}
            <input type="text" id="table-search" placeholder="Search records..." value="${escapeHTML(searchText)}" aria-label="Search records">
          </div>
          <button class="btn btn--ghost btn--sm" id="btn-toggle-filters">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters
            ${SearchFilter.getActiveFilters().length > 0 ? `<span class="filter-panel__count">${SearchFilter.getActiveFilters().length}</span>` : ''}
          </button>
          <div class="pagination__size" style="margin-left:auto;">
            <label class="sr-only" for="page-size-select">Rows per page</label>
            <select id="page-size-select" aria-label="Rows per page">
              ${[25, 50, 100, 250].map(s => `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s} rows</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="filter-panel-container"></div>

        <div class="data-grid-container" id="data-grid-container">
          ${renderGrid()}
        </div>

        <div class="pagination">
          <div class="pagination__info">
            Showing ${tableData.rows.length === 0 ? 0 : ((currentPage - 1) * pageSize + 1).toLocaleString()}-${Math.min(currentPage * pageSize, totalRows).toLocaleString()} of ${totalRows.toLocaleString()} records
          </div>
          <div class="pagination__controls">
            <button class="pagination__btn" id="page-first" ${currentPage <= 1 ? 'disabled' : ''} aria-label="First page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
            </button>
            <button class="pagination__btn" id="page-prev" ${currentPage <= 1 ? 'disabled' : ''} aria-label="Previous page">${SVG.chevLeft}</button>
            ${renderPageNumbers(currentPage, totalPages)}
            <button class="pagination__btn" id="page-next" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Next page">${SVG.chevRight}</button>
            <button class="pagination__btn" id="page-last" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Last page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    bindEvents();
  }

  function renderGrid() {
    if (tableData.rows.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </div>
          <div class="empty-state__title">No records found</div>
          <div class="empty-state__text">${searchText || SearchFilter.getActiveFilters().length ? 'Try adjusting your search or filters.' : 'This table is empty.'}</div>
        </div>
      `;
    }

    let html = '<table class="data-grid"><thead><tr>';
    html += '<th style="width:80px;">Actions</th>';

    for (const col of tableData.columns) {
      const isSorted = sortColumn === col;
      const arrowClass = isSorted ? 'sort-arrow sort-arrow--active' : 'sort-arrow';
      const arrowText = isSorted ? (sortDir === 'ASC' ? SVG.sortAsc : SVG.sortDesc) : SVG.sortNone;
      html += `<th data-column="${escapeHTML(col)}"><span>${escapeHTML(col)}</span> <span class="${arrowClass}">${arrowText}</span></th>`;
    }
    html += '</tr></thead><tbody>';

    for (let ri = 0; ri < tableData.rows.length; ri++) {
      const row = tableData.rows[ri];
      html += `<tr data-row-index="${ri}">`;
      html += `<td>
        <div class="row-actions">
          <button class="row-action-btn" data-action="view" data-row="${ri}" title="View record" aria-label="View record">${SVG.eye}</button>
          <button class="row-action-btn" data-action="edit" data-row="${ri}" title="Edit record" aria-label="Edit record">${SVG.edit}</button>
          <button class="row-action-btn row-action-btn--danger" data-action="delete" data-row="${ri}" title="Delete record" aria-label="Delete record">${SVG.trash}</button>
        </div>
      </td>`;

      for (let ci = 0; ci < row.length; ci++) {
        const val = row[ci];
        html += renderCell(val, tableData.columns[ci]);
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
  }

  function renderCell(val, colName) {
    if (val === null || val === undefined) {
      return `<td class="cell-null" title="NULL">NULL</td>`;
    }

    if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
      const size = val instanceof Uint8Array ? val.length : val.byteLength;
      return `<td class="cell-binary" title="Binary data (${size} bytes)">[BLOB ${formatBytes(size)}]</td>`;
    }

    const str = String(val);
    const isNumber = typeof val === 'number';

    // Truncate long values for display
    const displayStr = str.length > 120 ? str.substring(0, 120) + '…' : str;

    // Use textContent for safe rendering - we build the td and set text via a data attribute approach
    // Actually we'll escape HTML for the inline rendering
    const escaped = escapeHTML(displayStr);
    const title = str.length > 60 ? `title="${escapeHTML(str.substring(0, 200))}"` : '';

    return `<td class="${isNumber ? 'cell-number' : ''}" ${title}>${escaped}</td>`;
  }

  function renderPageNumbers(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => {
        const p = i + 1;
        return `<button class="pagination__btn ${p === current ? 'pagination__btn--active' : ''}" data-page="${p}">${p}</button>`;
      }).join('');
    }

    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);

    return pages.map(p => {
      if (p === '...') return '<span style="padding:0 4px;color:var(--clr-muted);">…</span>';
      return `<button class="pagination__btn ${p === current ? 'pagination__btn--active' : ''}" data-page="${p}">${p}</button>`;
    }).join('');
  }

  function bindEvents() {
    // Search
    const searchInput = document.getElementById('table-search');
    if (searchInput) {
      let debounce = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          searchText = searchInput.value;
          currentPage = 1;
          refresh();
        }, 300);
      });
    }

    // Page size
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        pageSize = parseInt(pageSizeSelect.value);
        currentPage = 1;
        refresh();
      });
    }

    // Pagination
    document.querySelectorAll('.pagination__btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        refresh();
      });
    });

    const pageFirst = document.getElementById('page-first');
    const pagePrev = document.getElementById('page-prev');
    const pageNext = document.getElementById('page-next');
    const pageLast = document.getElementById('page-last');
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    if (pageFirst) pageFirst.addEventListener('click', () => { currentPage = 1; refresh(); });
    if (pagePrev) pagePrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; refresh(); } });
    if (pageNext) pageNext.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; refresh(); } });
    if (pageLast) pageLast.addEventListener('click', () => { currentPage = totalPages; refresh(); });

    // Sorting
    document.querySelectorAll('.data-grid th[data-column]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.column;
        if (sortColumn === col) {
          sortDir = sortDir === 'ASC' ? 'DESC' : 'ASC';
        } else {
          sortColumn = col;
          sortDir = 'ASC';
        }
        currentPage = 1;
        refresh();
      });
    });

    // Row actions
    document.querySelectorAll('.row-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const rowIndex = parseInt(btn.dataset.row);
        const row = tableData.rows[rowIndex];
        const colNames = tableData.columns;

        if (action === 'view') {
          showCellInspector(row, colNames);
        } else if (action === 'edit') {
          RecordEditor.showEditForm(currentTable, columns, row, colNames, () => refresh());
        } else if (action === 'delete') {
          RecordEditor.confirmDelete(currentTable, columns, row, colNames, () => refresh());
        }
      });
    });

    // Add record
    const btnAdd = document.getElementById('btn-add-record');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        RecordEditor.showAddForm(currentTable, columns, () => refresh());
      });
    }

    // Export table
    const btnExport = document.getElementById('btn-export-table');
    if (btnExport) {
      btnExport.addEventListener('click', () => showTableExportModal());
    }

    // Refresh
    const btnRefresh = document.getElementById('btn-refresh-table');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => refresh());
    }

    // Schema info
    const btnSchema = document.getElementById('btn-schema-info');
    if (btnSchema) {
      btnSchema.addEventListener('click', () => showSchemaModal());
    }

    // Toggle filters
    const btnFilters = document.getElementById('btn-toggle-filters');
    if (btnFilters) {
      btnFilters.addEventListener('click', () => {
        SearchFilter.togglePanel(currentTable, columns, () => {
          currentPage = 1;
          refresh();
        });
      });
    }
  }

  function showCellInspector(row, colNames) {
    let bodyHtml = '<div class="cell-inspector">';
    for (let i = 0; i < colNames.length; i++) {
      const val = row[i];
      const colInfo = columns.find(c => c.name === colNames[i]);
      const typeName = colInfo ? colInfo.type : 'UNKNOWN';

      let displayVal;
      let isBinary = false;
      if (val === null || val === undefined) {
        displayVal = 'NULL';
      } else if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
        const bytes = val instanceof Uint8Array ? val : new Uint8Array(val);
        displayVal = `[BLOB: ${formatBytes(bytes.length)}]`;
        isBinary = true;
      } else {
        displayVal = String(val);
      }

      bodyHtml += `
        <div class="form-group">
          <div class="form-label">
            ${escapeHTML(colNames[i])}
            <span class="form-label__type">${escapeHTML(typeName)}</span>
          </div>
          <div class="cell-inspector__content ${val === null ? 'text-muted' : ''} ${isBinary ? 'cell-binary' : ''}" id="cell-val-${i}"></div>
        </div>
      `;
    }
    bodyHtml += '</div>';

    App.showModal({
      title: 'Record Inspector',
      icon: 'primary',
      iconSvg: SVG.eye,
      body: bodyHtml,
      size: 'lg',
      buttons: [
        { label: 'Copy All', class: 'btn btn--ghost', action: () => {
          const text = colNames.map((c, i) => `${c}: ${row[i] === null ? 'NULL' : row[i]}`).join('\n');
          navigator.clipboard.writeText(text).then(() => Notifications.success('Copied', 'Record data copied to clipboard.'));
        }},
        { label: 'Close', class: 'btn btn--primary', close: true }
      ]
    });

    // Set text content safely
    for (let i = 0; i < colNames.length; i++) {
      const el = document.getElementById(`cell-val-${i}`);
      if (el) {
        const val = row[i];
        if (val === null || val === undefined) {
          el.textContent = 'NULL';
        } else if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
          el.textContent = `[BLOB: ${formatBytes(val instanceof Uint8Array ? val.length : val.byteLength)}]`;
        } else {
          el.textContent = String(val);
        }
      }
    }
  }

  function showSchemaModal() {
    const sql = Database.getTableSQL(currentTable);
    const info = Database.getTableInfo(currentTable);

    let bodyHtml = `
      <div class="db-info__section">
        <div class="db-info__section-title">Column Details</div>
        <table class="data-grid" style="font-size:var(--fs-xs);">
          <thead><tr>
            <th>Name</th><th>Type</th><th>Not Null</th><th>Default</th><th>Primary Key</th>
          </tr></thead>
          <tbody>
    `;
    for (const col of info) {
      bodyHtml += `<tr>
        <td class="text-mono">${escapeHTML(col.name)}</td>
        <td class="text-mono text-muted">${escapeHTML(col.type)}</td>
        <td>${col.notNull ? 'Yes' : ''}</td>
        <td class="text-mono">${col.defaultValue !== null ? escapeHTML(String(col.defaultValue)) : '<span class="text-muted">-</span>'}</td>
        <td>${col.primaryKey ? `PK${col.pkOrder > 1 ? ' (' + col.pkOrder + ')' : ''}` : ''}</td>
      </tr>`;
    }
    bodyHtml += '</tbody></table></div>';

    bodyHtml += `
      <div class="db-info__section" style="border-bottom:none;">
        <div class="db-info__section-title">CREATE Statement</div>
        <div class="schema-block">${escapeHTML(sql || 'No schema available.')}</div>
      </div>
    `;

    App.showModal({
      title: `Schema: ${currentTable}`,
      icon: 'primary',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      body: bodyHtml,
      size: 'lg',
      buttons: [
        { label: 'Close', class: 'btn btn--primary', close: true }
      ]
    });
  }

  function showTableExportModal() {
    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:var(--sp-3);">
        <div class="form-group">
          <label class="form-label">Export scope</label>
          <select class="form-select" id="export-scope" aria-label="Export scope">
            <option value="all">All records (${totalRows.toLocaleString()})</option>
            <option value="page">Current page (${tableData.rows.length})</option>
            ${searchText || SearchFilter.getActiveFilters().length > 0 ? `<option value="filtered">Filtered results (${totalRows.toLocaleString()})</option>` : ''}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Format</label>
          <select class="form-select" id="export-format" aria-label="Export format">
            <option value="csv">CSV (.csv)</option>
            <option value="json">JSON (.json)</option>
            <option value="xlsx">Excel (.xlsx)</option>
          </select>
        </div>
      </div>
    `;

    App.showModal({
      title: `Export: ${currentTable}`,
      icon: 'primary',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
      body: bodyHtml,
      buttons: [
        { label: 'Cancel', class: 'btn btn--ghost', close: true },
        {
          label: 'Export', class: 'btn btn--primary', action: () => {
            const scope = document.getElementById('export-scope').value;
            const format = document.getElementById('export-format').value;
            performTableExport(scope, format);
            App.closeModal();
          }
        }
      ]
    });
  }

  function performTableExport(scope, format) {
    try {
      let data;

      if (scope === 'page') {
        data = { columns: tableData.columns, rows: tableData.rows };
      } else {
        // All or filtered
        data = Database.getAllTableData(currentTable);
      }

      const baseName = `${currentTable}_export`;

      switch (format) {
        case 'csv':
          ExportManager.exportCSV(data, baseName);
          break;
        case 'json':
          ExportManager.exportJSON(data, baseName);
          break;
        case 'xlsx':
          ExportManager.exportExcel(data, currentTable, baseName);
          break;
      }
      Notifications.success('Export complete', `${currentTable} exported as ${format.toUpperCase()}.`);
    } catch (e) {
      Notifications.error('Export failed', e.message);
    }
  }

  // -- Getters --
  function getCurrentTable() { return currentTable; }
  function getTotalRows() { return totalRows; }
  function getPageSize() { return pageSize; }
  function getCurrentPage() { return currentPage; }
  function getSearchText() { return searchText; }
  function getCurrentData() { return tableData; }

  // -- Helpers --
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  return {
    loadTable, refresh, render,
    getCurrentTable, getTotalRows, getPageSize, getCurrentPage,
    getSearchText, getCurrentData,
    escapeHTML, formatBytes
  };
})();
