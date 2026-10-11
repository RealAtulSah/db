/**
 * query-editor.js - SQL query editor with syntax highlighting, history, and results
 */
const QueryEditor = (() => {
  let history = [];
  const MAX_HISTORY = 50;

  function render(container) {
    container.innerHTML = `
      <div class="section-header">
        <div class="section-header__icon section-header__icon--dark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </div>
        <div>
          <div class="section-header__title">SQL Query Editor</div>
          <div class="section-header__subtitle">Execute SQL queries against the loaded database</div>
        </div>
      </div>

      <div class="sql-editor">
        <div class="sql-editor__input-wrap">
          <textarea class="sql-editor__textarea" id="sql-input"
            placeholder="Enter your SQL query here...&#10;&#10;Examples:&#10;  SELECT * FROM table_name;&#10;  SELECT name, email FROM users WHERE id > 10;&#10;  INSERT INTO users (name) VALUES ('Atul Sah');"
            spellcheck="false" aria-label="SQL query input"></textarea>
          <div class="sql-editor__toolbar">
            <button class="btn btn--primary btn--sm" id="btn-run-query">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Run Query
            </button>
            <button class="btn btn--ghost btn--sm" id="btn-clear-query">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear
            </button>
            <button class="btn btn--ghost btn--sm" id="btn-export-results" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Results
            </button>
            <div class="sql-editor__shortcut">
              <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run
            </div>
          </div>
          <div class="sql-snippets" style="display:flex;flex-wrap:wrap;gap:var(--sp-2);align-items:center;padding:var(--sp-2) var(--sp-3);background:var(--clr-surface);border-top:1px solid var(--clr-border);">
            <span style="font-size:var(--fs-xs);color:var(--clr-muted);font-weight:var(--fw-medium);">Snippets:</span>
            <button class="btn btn--ghost btn--sm sql-snippet-btn" data-sql="SELECT * FROM products LIMIT 20;">Products</button>
            <button class="btn btn--ghost btn--sm sql-snippet-btn" data-sql="SELECT c.name, c.country, count(o.id) AS orders_count, round(sum(o.total_amount), 2) AS total_spent FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id ORDER BY total_spent DESC;">Customer Spending</button>
            <button class="btn btn--ghost btn--sm sql-snippet-btn" data-sql="SELECT p.name, sum(oi.quantity) AS sold, round(sum(oi.quantity * oi.unit_price), 2) AS revenue FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.id ORDER BY revenue DESC;">Product Revenue</button>
            <button class="btn btn--ghost btn--sm sql-snippet-btn" data-sql="SELECT * FROM v_customer_order_summary;">Summary View</button>
          </div>
        </div>

        <div id="query-result-area"></div>

        <div class="query-history" id="query-history" style="${history.length === 0 ? 'display:none;' : ''}">
          <div class="query-history__title">Query History</div>
          <div id="query-history-list">
            ${renderHistory()}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const input = document.getElementById('sql-input');
    const btnRun = document.getElementById('btn-run-query');
    const btnClear = document.getElementById('btn-clear-query');
    const btnExport = document.getElementById('btn-export-results');

    // Run query
    btnRun.addEventListener('click', () => runQuery());

    // Clear
    btnClear.addEventListener('click', () => {
      input.value = '';
      input.focus();
    });

    // Export results
    btnExport.addEventListener('click', () => showExportResultsModal());

    // Keyboard shortcut
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runQuery();
      }
      // Tab key inserts 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.substring(0, start) + '  ' + input.value.substring(end);
        input.selectionStart = input.selectionEnd = start + 2;
      }
    });

    // History item clicks
    bindHistoryEvents();

    // Snippet clicks
    document.querySelectorAll('.sql-snippet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.sql;
        input.focus();
      });
    });
  }

  let lastResults = null;

  function runQuery() {
    const input = document.getElementById('sql-input');
    const sql = input.value.trim();
    if (!sql) {
      Notifications.warning('Empty query', 'Please enter a SQL query to execute.');
      return;
    }

    // Classify SQL
    const classification = Database.classifySQL(sql);

    if (classification.destructive) {
      App.showModal({
        title: 'Destructive Operation',
        icon: 'danger',
        iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        body: `
          <p style="margin-bottom:var(--sp-3);">This query contains a <strong>${classification.type}</strong> operation that could permanently modify or delete data.</p>
          <div class="schema-block" style="max-height:120px;">${TableView.escapeHTML(sql)}</div>
          <p style="margin-top:var(--sp-3);color:var(--clr-warning);font-size:var(--fs-sm);">This action cannot be undone. Are you sure you want to proceed?</p>
        `,
        size: 'sm',
        buttons: [
          { label: 'Cancel', class: 'btn btn--ghost', close: true },
          { label: `Execute ${classification.type}`, class: 'btn btn--danger', action: () => { executeAndDisplay(sql); App.closeModal(); } }
        ]
      });
    } else {
      executeAndDisplay(sql);
    }
  }

  function executeAndDisplay(sql) {
    const resultArea = document.getElementById('query-result-area');
    if (!resultArea) return;

    try {
      const { results, changes, duration } = Database.executeSQL(sql);

      // Add to history
      addToHistory(sql, duration);

      // Check if it was a write operation (refresh tables)
      const classification = Database.classifySQL(sql);
      if (classification.destructive || classification.isWrite) {
        App.refreshSidebar();
        App.updateTopBar();
      }

      if (results.length === 0) {
        // Non-SELECT query
        resultArea.innerHTML = `
          <div class="sql-editor__result">
            <div class="sql-editor__result-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--clr-success);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Query executed successfully
              <div class="sql-editor__result-meta">${changes} row${changes !== 1 ? 's' : ''} affected · ${duration.toFixed(1)}ms</div>
            </div>
          </div>
        `;
        lastResults = null;
        document.getElementById('btn-export-results').disabled = true;
      } else {
        // Display results
        const result = results[0];
        lastResults = { columns: result.columns, rows: result.values };

        const displayRows = result.values.slice(0, 500); // Limit display
        const truncated = result.values.length > 500;

        let tableHtml = '<div class="data-grid-container" style="max-height:400px;"><table class="data-grid"><thead><tr>';
        for (const col of result.columns) {
          tableHtml += `<th>${TableView.escapeHTML(col)}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';

        for (const row of displayRows) {
          tableHtml += '<tr>';
          for (const val of row) {
            if (val === null || val === undefined) {
              tableHtml += '<td class="cell-null">NULL</td>';
            } else if (val instanceof Uint8Array) {
              tableHtml += `<td class="cell-binary">[BLOB ${TableView.formatBytes(val.length)}]</td>`;
            } else {
              const str = String(val);
              const display = str.length > 100 ? str.substring(0, 100) + '…' : str;
              tableHtml += `<td>${TableView.escapeHTML(display)}</td>`;
            }
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';

        resultArea.innerHTML = `
          <div class="sql-editor__result">
            <div class="sql-editor__result-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--clr-success);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Results: ${result.values.length.toLocaleString()} row${result.values.length !== 1 ? 's' : ''}
              ${truncated ? `<span style="color:var(--clr-warning);font-size:var(--fs-xs);">(showing first 500)</span>` : ''}
              <div class="sql-editor__result-meta">${result.columns.length} columns · ${duration.toFixed(1)}ms</div>
            </div>
            ${tableHtml}
          </div>
        `;

        document.getElementById('btn-export-results').disabled = false;
      }

      App.updateStatusBar();

    } catch (e) {
      resultArea.innerHTML = `
        <div class="sql-editor__error">
          <strong>SQL Error:</strong> ${TableView.escapeHTML(e.message)}
        </div>
      `;
      lastResults = null;
      document.getElementById('btn-export-results').disabled = true;
    }
  }

  function addToHistory(sql, duration) {
    history.unshift({
      sql: sql.trim(),
      time: new Date().toLocaleTimeString(),
      duration: duration.toFixed(1) + 'ms'
    });
    if (history.length > MAX_HISTORY) history.pop();

    const histEl = document.getElementById('query-history');
    const listEl = document.getElementById('query-history-list');
    if (histEl) histEl.style.display = '';
    if (listEl) {
      listEl.innerHTML = renderHistory();
      bindHistoryEvents();
    }
  }

  function renderHistory() {
    return history.map((h, i) => `
      <div class="query-history__item" data-hist-index="${i}" title="${TableView.escapeHTML(h.sql)}">
        <span class="query-history__sql">${TableView.escapeHTML(h.sql)}</span>
        <span class="query-history__time">${h.duration}</span>
      </div>
    `).join('');
  }

  function bindHistoryEvents() {
    document.querySelectorAll('.query-history__item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.histIndex);
        const input = document.getElementById('sql-input');
        if (input && history[idx]) {
          input.value = history[idx].sql;
          input.focus();
        }
      });
    });
  }

  function showExportResultsModal() {
    if (!lastResults) return;

    App.showModal({
      title: 'Export Query Results',
      icon: 'primary',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
      body: `
        <div class="form-group">
          <label class="form-label">Format</label>
          <select class="form-select" id="result-export-format" aria-label="Export format">
            <option value="csv">CSV (.csv)</option>
            <option value="json">JSON (.json)</option>
            <option value="xlsx">Excel (.xlsx)</option>
          </select>
        </div>
        <p class="text-sm text-muted" style="margin-top:var(--sp-2);">Exporting ${lastResults.rows.length.toLocaleString()} rows.</p>
      `,
      buttons: [
        { label: 'Cancel', class: 'btn btn--ghost', close: true },
        {
          label: 'Export', class: 'btn btn--primary', action: () => {
            const format = document.getElementById('result-export-format').value;
            try {
              const baseName = 'query_results';
              switch (format) {
                case 'csv': ExportManager.exportCSV(lastResults, baseName); break;
                case 'json': ExportManager.exportJSON(lastResults, baseName); break;
                case 'xlsx': ExportManager.exportExcel(lastResults, 'Query Results', baseName); break;
              }
              Notifications.success('Export complete', `Query results exported as ${format.toUpperCase()}.`);
            } catch (e) {
              Notifications.error('Export failed', e.message);
            }
            App.closeModal();
          }
        }
      ]
    });
  }

  return { render, runQuery, history };
})();
