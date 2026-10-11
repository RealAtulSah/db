/**
 * app.js - Main application controller
 *
 * Manages navigation, database lifecycle, UI state, and modal system.
 */
const App = (() => {
  let currentSection = 'welcome';
  let sidebarOpen = false;

  // SVG icons used throughout the app
  const ICONS = {
    database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    overview: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    table: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
    query: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    tableIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
    chevDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><polyline points="6 9 12 15 18 9"/></svg>`,
    reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
    openFile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  };

  /**
   * Initialize the application.
   */
  async function init() {
    Notifications.init();
    renderShell();
    bindGlobalEvents();
    showSection('welcome');

    // Warn about unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (Database.isLoaded() && Database.isModified()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved database changes. Are you sure you want to leave?';
      }
    });
  }

  /**
   * Render the main app shell.
   */
  function renderShell() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-shell">
        <!-- Top Bar -->
        <header class="topbar" role="banner">
          <button class="btn btn--icon topbar__menu-btn" id="btn-toggle-sidebar" aria-label="Toggle sidebar menu">${ICONS.menu}</button>
          <div class="topbar__brand">
            <div class="topbar__logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="#FFD600" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
            <div class="topbar__title">DB <span>File</span> Explorer</div>
          </div>

          <div class="topbar__separator"></div>

          <div class="topbar__file-info">
            <span class="topbar__filename" id="topbar-filename">No database loaded</span>
            <span class="topbar__filesize" id="topbar-filesize"></span>
            <div class="topbar__status topbar__status--idle" id="topbar-status">
              <span class="topbar__status-dot"></span>
              <span id="topbar-status-text">Idle</span>
            </div>
          </div>

          <div class="topbar__actions">
            <button class="btn btn--secondary btn--sm" id="btn-open-db" aria-label="Open database file">
              ${ICONS.openFile}
              Open Database
            </button>
            <button class="btn btn--secondary btn--sm" id="btn-sample-db" aria-label="Load demo sample database">
              ${ICONS.database}
              Sample DB
            </button>
            <button class="btn btn--primary btn--sm hidden" id="btn-save-db" aria-label="Download modified database">
              ${ICONS.save}
              Save Database
            </button>
            <button class="btn btn--secondary btn--sm hidden" id="btn-reset-db" aria-label="Reset to original" title="Reset to original uploaded state">
              ${ICONS.reset}
            </button>
          </div>
        </header>

        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
          <nav class="sidebar__nav">
            <div class="sidebar__item sidebar__item--active" data-section="overview">
              ${ICONS.overview}
              <span class="sidebar__item-text">Overview</span>
            </div>
            <div class="sidebar__item" data-section="tables">
              ${ICONS.table}
              <span class="sidebar__item-text">Tables</span>
              <span class="sidebar__item-badge" id="sidebar-table-count">0</span>
            </div>
            <div class="sidebar__item" data-section="query">
              ${ICONS.query}
              <span class="sidebar__item-text">SQL Query Editor</span>
            </div>
            <div class="sidebar__item" data-section="search">
              ${ICONS.search}
              <span class="sidebar__item-text">Search &amp; Filter</span>
            </div>
            <div class="sidebar__item" data-section="export">
              ${ICONS.export}
              <span class="sidebar__item-text">Export Centre</span>
            </div>
            <div class="sidebar__item" data-section="dbinfo">
              ${ICONS.info}
              <span class="sidebar__item-text">Database Info</span>
            </div>
          </nav>

          <div class="sidebar__divider"></div>

          <div class="sidebar__section-label" id="sidebar-tables-label" style="display:none;">
            Tables ${ICONS.chevDown}
          </div>
          <div class="sidebar__tables" id="sidebar-tables"></div>
        </aside>

        <!-- Main -->
        <main class="main" id="main" role="main">
          <div class="main__content" id="main-content"></div>
        </main>

        <!-- Status Bar -->
        <footer class="statusbar" id="statusbar" role="contentinfo">
          <div class="statusbar__item" id="status-table">
            ${ICONS.tableIcon}
            <span id="status-table-text">No table selected</span>
          </div>
          <div class="statusbar__item" id="status-rows" style="display:none;">
            <span id="status-rows-text"></span>
          </div>
          <div class="statusbar__spacer"></div>
          <div class="statusbar__item" id="status-modified" style="display:none;">
            <span style="color:var(--clr-warning);">Unsaved changes</span>
          </div>
          <div class="statusbar__item">
            <span>Developed by <a href="https://atulsah.in" target="_blank" rel="noopener noreferrer" style="color:var(--clr-primary);text-decoration:none;font-weight:var(--fw-medium);">Atul Sah</a></span>
          </div>
        </footer>
      </div>

      <!-- Modal overlay -->
      <div class="modal-overlay" id="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal" id="modal"></div>
      </div>

      <!-- Hidden file input -->
      <input type="file" id="file-input" accept="${FormatDetector.getAcceptedExtensions()}" style="display:none;" aria-hidden="true">

      <!-- Notifications -->
      <div class="notifications" id="notifications" aria-live="polite"></div>
    `;
  }

  /**
   * Bind global event listeners.
   */
  function bindGlobalEvents() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar__item[data-section]').forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        if (!Database.isLoaded() && section !== 'welcome') {
          Notifications.warning('No database', 'Please open a database file first.');
          return;
        }
        showSection(section);
        closeSidebar();
      });
    });

    // Open DB buttons
    document.getElementById('btn-open-db').addEventListener('click', () => triggerFileOpen());
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
    document.getElementById('btn-sample-db').addEventListener('click', handleLoadSampleDB);

    // Save DB
    document.getElementById('btn-save-db').addEventListener('click', downloadModifiedDB);

    // Reset DB
    document.getElementById('btn-reset-db').addEventListener('click', () => {
      showModal({
        title: 'Reset Database',
        icon: 'warning',
        iconSvg: ICONS.reset,
        body: '<p>Reset the database to the original uploaded state? All modifications will be lost.</p>',
        size: 'sm',
        buttons: [
          { label: 'Cancel', class: 'btn btn--ghost', close: true },
          {
            label: 'Reset', class: 'btn btn--danger', action: () => {
              try {
                Database.resetToOriginal();
                Notifications.success('Database reset', 'Reverted to original state.');
                updateTopBar();
                refreshSidebar();
                showSection('overview');
              } catch (e) {
                Notifications.error('Reset failed', e.message);
              }
              closeModal();
            }
          }
        ]
      });
    });

    // Mobile sidebar toggle
    document.getElementById('btn-toggle-sidebar').addEventListener('click', toggleSidebar);

    // Close sidebar on overlay click (mobile)
    document.addEventListener('click', (e) => {
      if (sidebarOpen && !document.getElementById('sidebar').contains(e.target)
          && !document.getElementById('btn-toggle-sidebar').contains(e.target)) {
        closeSidebar();
      }
    });

    // Modal overlay close
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('modal-overlay');
        if (overlay.classList.contains('modal-overlay--visible')) {
          closeModal();
        }
      }
    });

    // Drag-and-drop on the whole app
    const mainEl = document.getElementById('main');
    mainEl.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
    mainEl.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); handleFileDrop(e); });
  }

  /**
   * Navigate to a section.
   */
  function showSection(section) {
    currentSection = section;

    // Update sidebar active state
    document.querySelectorAll('.sidebar__item[data-section]').forEach(item => {
      item.classList.toggle('sidebar__item--active', item.dataset.section === section);
    });

    const container = document.getElementById('main-content');

    if (!Database.isLoaded()) {
      renderWelcome(container);
      return;
    }

    switch (section) {
      case 'overview': renderOverview(container); break;
      case 'tables':   renderTablesSection(container); break;
      case 'query':    QueryEditor.render(container); break;
      case 'search':   renderSearchSection(container); break;
      case 'export':   renderExportCentre(container); break;
      case 'dbinfo':   renderDBInfo(container); break;
      default:         renderOverview(container); break;
    }
  }

  // --- Section Renderers ---

  function renderWelcome(container) {
    container.innerHTML = `
      <div class="welcome">
        <div class="welcome__icon">${ICONS.database}</div>
        <h1 class="welcome__title">DB File Explorer</h1>
        <p class="welcome__subtitle">
          Open, inspect, query, edit and export SQLite database files directly in your browser. No installation required. All processing happens locally.
        </p>

        <div class="dropzone" id="dropzone" role="button" tabindex="0" aria-label="Drop database file here or click to browse">
          <div class="dropzone__icon">${ICONS.upload}</div>
          <div class="dropzone__text">Drop your database file here</div>
          <div class="dropzone__hint">.db, .sqlite, .sqlite3, .sql files supported</div>
          <div class="dropzone__or">or</div>
          <button class="btn btn--primary" id="btn-browse-files">Browse Files</button>
          <input type="file" id="dropzone-file-input" accept="${FormatDetector.getAcceptedExtensions()}" style="display:none;" aria-hidden="true">
        </div>

        <div style="margin-top:var(--sp-4);display:flex;flex-direction:column;align-items:center;gap:var(--sp-2);">
          <div style="font-size:var(--fs-xs);color:var(--clr-muted);font-weight:var(--fw-medium);">Don't have a database file ready?</div>
          <button class="btn btn--secondary" id="btn-load-sample" style="display:inline-flex;align-items:center;gap:var(--sp-2);">
            ${ICONS.database}
            Load Demo E-Commerce Database
          </button>
        </div>

        <p style="margin-top:var(--sp-5);font-size:var(--fs-xs);color:var(--clr-muted);max-width:380px;text-align:center;">
          All operations run entirely in-browser using WebAssembly. No data is sent to any server.
        </p>
        <p style="margin-top:var(--sp-2);font-size:var(--fs-xs);color:var(--clr-muted);text-align:center;">
          Developed by <a href="https://atulsah.in" target="_blank" rel="noopener noreferrer" style="color:var(--clr-primary);text-decoration:none;font-weight:var(--fw-medium);">Atul Sah</a>
        </p>
      </div>
    `;

    // Dropzone events
    const dropzone = document.getElementById('dropzone');
    const dzInput = document.getElementById('dropzone-file-input');
    const btnBrowse = document.getElementById('btn-browse-files');

    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dropzone--active'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dropzone--active'));
    dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dropzone--active'); handleFileDrop(e); });
    dropzone.addEventListener('click', (e) => { if (e.target !== btnBrowse) dzInput.click(); });
    dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') dzInput.click(); });

    btnBrowse.addEventListener('click', (e) => { e.stopPropagation(); dzInput.click(); });
    dzInput.addEventListener('change', handleFileSelect);

    const btnSample = document.getElementById('btn-load-sample');
    if (btnSample) {
      btnSample.addEventListener('click', handleLoadSampleDB);
    }
  }

  function renderOverview(container) {
    const info = Database.getInfo();
    const tables = Database.getTables();
    const views = Database.getViews();
    const indexes = Database.getIndexes();

    // Get counts for each table (up to 20 tables, lazy for large DBs)
    const tableCounts = [];
    for (const t of tables) {
      try {
        const count = tables.length <= 50 ? Database.getRowCount(t) : null;
        const cols = Database.getTableInfo(t);
        tableCounts.push({ name: t, columns: cols.length, rows: count });
      } catch (_) {
        tableCounts.push({ name: t, columns: '?', rows: null });
      }
    }

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header__icon section-header__icon--dark">${ICONS.overview}</div>
        <div>
          <div class="section-header__title">Database Overview</div>
          <div class="section-header__subtitle">${TableView.escapeHTML(info.filename)}</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dash-card dash-card--accent">
          <div class="dash-card__label">Format</div>
          <div class="dash-card__value">${TableView.escapeHTML(info.format)}</div>
        </div>
        <div class="dash-card dash-card--accent">
          <div class="dash-card__label">File Size</div>
          <div class="dash-card__value">${TableView.formatBytes(info.fileSize)}</div>
        </div>
        <div class="dash-card dash-card--accent">
          <div class="dash-card__label">Tables</div>
          <div class="dash-card__value">${tables.length}</div>
        </div>
        <div class="dash-card">
          <div class="dash-card__label">Views</div>
          <div class="dash-card__value">${views.length}</div>
        </div>
        <div class="dash-card">
          <div class="dash-card__label">Indexes</div>
          <div class="dash-card__value">${indexes.length}</div>
        </div>
        <div class="dash-card">
          <div class="dash-card__label">Status</div>
          <div class="dash-card__value" style="font-size:var(--fs-md);color:${info.modified ? 'var(--clr-warning)' : 'var(--clr-success)'};">${info.modified ? 'Modified' : 'Unmodified'}</div>
        </div>
      </div>

      ${tables.length > 0 ? `
        <div class="section-header" style="margin-top:var(--sp-6);">
          <div class="section-header__icon">${ICONS.table}</div>
          <div><div class="section-header__title">Tables</div></div>
        </div>

        <div class="table-list">
          <div class="table-list__header">
            <div>Name</div>
            <div style="text-align:center;">Columns</div>
            <div style="text-align:center;">Rows</div>
            <div style="text-align:center;">Action</div>
          </div>
          ${tableCounts.map(t => `
            <div class="table-list__row" data-table-name="${TableView.escapeHTML(t.name)}">
              <div class="table-list__name">${TableView.escapeHTML(t.name)}</div>
              <div class="table-list__cols">${t.columns}</div>
              <div class="table-list__rows">${t.rows !== null ? t.rows.toLocaleString() : '-'}</div>
              <div class="table-list__action">
                <button class="btn btn--ghost btn--sm" data-open-table="${TableView.escapeHTML(t.name)}">Open</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state" style="margin-top:var(--sp-6);">
          <div class="empty-state__icon">${ICONS.table}</div>
          <div class="empty-state__title">No user tables</div>
          <div class="empty-state__text">This database does not contain any user tables.</div>
        </div>
      `}
    `;

    // Bind table open buttons
    document.querySelectorAll('[data-open-table]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTable(btn.dataset.openTable);
      });
    });

    document.querySelectorAll('.table-list__row[data-table-name]').forEach(row => {
      row.addEventListener('click', () => openTable(row.dataset.tableName));
    });
  }

  function renderTablesSection(container) {
    const tables = Database.getTables();
    if (tables.length === 0) {
      container.innerHTML = `
        <div class="section-header">
          <div class="section-header__icon section-header__icon--dark">${ICONS.table}</div>
          <div><div class="section-header__title">Tables</div></div>
        </div>
        <div class="empty-state">
          <div class="empty-state__icon">${ICONS.table}</div>
          <div class="empty-state__title">No tables</div>
          <div class="empty-state__text">This database has no user tables.</div>
        </div>
      `;
      return;
    }

    // If a table is already selected, show it
    if (TableView.getCurrentTable()) {
      TableView.refresh();
    } else {
      // Show first table
      openTable(tables[0]);
    }
  }

  function renderSearchSection(container) {
    const tables = Database.getTables();
    if (tables.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">${ICONS.search}</div>
          <div class="empty-state__title">No tables available</div>
          <div class="empty-state__text">Open a database with tables to use search and filter.</div>
        </div>
      `;
      return;
    }

    const currentTable = TableView.getCurrentTable() || tables[0];

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header__icon section-header__icon--dark">${ICONS.search}</div>
        <div>
          <div class="section-header__title">Search &amp; Filter</div>
          <div class="section-header__subtitle">Search and filter records across tables</div>
        </div>
      </div>

      <div class="form-group" style="max-width:300px;margin-bottom:var(--sp-4);">
        <label class="form-label" for="search-table-select">Select Table</label>
        <select class="form-select" id="search-table-select" aria-label="Select table">
          ${tables.map(t => `<option value="${TableView.escapeHTML(t)}" ${t === currentTable ? 'selected' : ''}>${TableView.escapeHTML(t)}</option>`).join('')}
        </select>
      </div>
    `;

    // Load the table view
    TableView.loadTable(currentTable);

    // Bind table select
    document.getElementById('search-table-select').addEventListener('change', (e) => {
      SearchFilter.reset();
      openTable(e.target.value);
    });
  }

  function renderExportCentre(container) {
    const tables = Database.getTables();
    const info = Database.getInfo();

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header__icon section-header__icon--dark">${ICONS.export}</div>
        <div>
          <div class="section-header__title">Export Centre</div>
          <div class="section-header__subtitle">Export tables and query results in multiple formats</div>
        </div>
      </div>

      <div class="export-grid">
        <div class="export-card">
          <div class="export-card__icon export-card__icon--csv">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="export-card__title">CSV Export</div>
          <div class="export-card__desc">Comma-separated values with proper quoting and UTF-8 BOM for spreadsheet compatibility.</div>
          <div class="export-card__options">
            <div class="form-group" style="margin-bottom:var(--sp-2);">
              <select class="form-select" id="csv-table-select" aria-label="Table to export as CSV">
                ${tables.map(t => `<option value="${TableView.escapeHTML(t)}">${TableView.escapeHTML(t)}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn--ghost btn--sm" id="btn-export-csv" ${tables.length === 0 ? 'disabled' : ''}>Export CSV</button>
          </div>
        </div>

        <div class="export-card">
          <div class="export-card__icon export-card__icon--json">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="export-card__title">JSON Export</div>
          <div class="export-card__desc">Pretty-printed JSON array with proper type preservation and NULL handling.</div>
          <div class="export-card__options">
            <div class="form-group" style="margin-bottom:var(--sp-2);">
              <select class="form-select" id="json-table-select" aria-label="Table to export as JSON">
                ${tables.map(t => `<option value="${TableView.escapeHTML(t)}">${TableView.escapeHTML(t)}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn--ghost btn--sm" id="btn-export-json" ${tables.length === 0 ? 'disabled' : ''}>Export JSON</button>
          </div>
        </div>

        <div class="export-card">
          <div class="export-card__icon export-card__icon--xlsx">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="export-card__title">Excel Export</div>
          <div class="export-card__desc">Professional .xlsx workbook with styled headers, auto-width columns, frozen rows, and filters.</div>
          <div class="export-card__options">
            <div class="form-group" style="margin-bottom:var(--sp-2);">
              <select class="form-select" id="xlsx-table-select" aria-label="Table to export as Excel">
                <option value="__single__">Single table...</option>
                <option value="__all__">All tables (multi-sheet)</option>
                ${tables.map(t => `<option value="${TableView.escapeHTML(t)}">${TableView.escapeHTML(t)}</option>`).join('')}
              </select>
            </div>
            <label class="form-checkbox" style="font-size:var(--fs-xs);margin-bottom:var(--sp-2);">
              <input type="checkbox" id="xlsx-include-summary" checked> Include summary sheet
            </label>
            <button class="btn btn--primary btn--sm" id="btn-export-xlsx" ${tables.length === 0 ? 'disabled' : ''}>Export Excel</button>
          </div>
        </div>

        <div class="export-card">
          <div class="export-card__icon export-card__icon--db">
            ${ICONS.database}
          </div>
          <div class="export-card__title">Database Download</div>
          <div class="export-card__desc">Download the current in-memory database as a new .db file. The original file remains unchanged.</div>
          <div class="export-card__options">
            <div class="text-xs text-muted" style="margin-bottom:var(--sp-2);">
              Status: ${info.modified ? '<span style="color:var(--clr-warning);">Modified</span>' : '<span style="color:var(--clr-success);">Unmodified</span>'}
            </div>
            <button class="btn btn--ghost btn--sm" id="btn-download-db">Download .db File</button>
          </div>
        </div>
      </div>
    `;

    // Bind export buttons
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      const table = document.getElementById('csv-table-select').value;
      try {
        const data = Database.getAllTableData(table);
        ExportManager.exportCSV(data, `${table}_export`);
        Notifications.success('CSV exported', `${table} exported successfully.`);
      } catch (e) { Notifications.error('Export failed', e.message); }
    });

    document.getElementById('btn-export-json').addEventListener('click', () => {
      const table = document.getElementById('json-table-select').value;
      try {
        const data = Database.getAllTableData(table);
        ExportManager.exportJSON(data, `${table}_export`);
        Notifications.success('JSON exported', `${table} exported successfully.`);
      } catch (e) { Notifications.error('Export failed', e.message); }
    });

    document.getElementById('btn-export-xlsx').addEventListener('click', () => {
      const selected = document.getElementById('xlsx-table-select').value;
      const includeSummary = document.getElementById('xlsx-include-summary').checked;

      try {
        if (selected === '__all__' || selected === '__single__') {
          // Multi-table export
          const tableDataList = tables.map(t => ({
            name: t,
            data: Database.getAllTableData(t)
          }));
          ExportManager.exportMultiTableExcel(tableDataList, `${info.filename}_export`, { includeSummary });
          Notifications.success('Excel exported', `${tables.length} tables exported to workbook.`);
        } else {
          const data = Database.getAllTableData(selected);
          ExportManager.exportExcel(data, selected, `${selected}_export`);
          Notifications.success('Excel exported', `${selected} exported successfully.`);
        }
      } catch (e) { Notifications.error('Export failed', e.message); }
    });

    document.getElementById('btn-download-db').addEventListener('click', downloadModifiedDB);
  }

  function renderDBInfo(container) {
    const info = Database.getInfo();
    const schema = Database.getFullSchema();
    const tables = Database.getTables();
    const views = Database.getViews();
    const indexes = Database.getIndexes();

    container.innerHTML = `
      <div class="section-header">
        <div class="section-header__icon section-header__icon--dark">${ICONS.info}</div>
        <div>
          <div class="section-header__title">Database Information</div>
          <div class="section-header__subtitle">Detailed information about the loaded database</div>
        </div>
      </div>

      <div class="db-info">
        <div class="db-info__section">
          <div class="db-info__section-title">General</div>
          <div class="db-info__row"><div class="db-info__label">Filename</div><div class="db-info__value">${TableView.escapeHTML(info.filename)}</div></div>
          <div class="db-info__row"><div class="db-info__label">Format</div><div class="db-info__value">${TableView.escapeHTML(info.format)}</div></div>
          <div class="db-info__row"><div class="db-info__label">File Size</div><div class="db-info__value">${TableView.formatBytes(info.fileSize)}</div></div>
          <div class="db-info__row"><div class="db-info__label">Status</div><div class="db-info__value" style="color:${info.modified ? 'var(--clr-warning)' : 'var(--clr-success)'};">${info.modified ? 'Modified' : 'Unmodified'}</div></div>
        </div>

        <div class="db-info__section">
          <div class="db-info__section-title">Objects</div>
          <div class="db-info__row"><div class="db-info__label">User Tables</div><div class="db-info__value">${tables.length}</div></div>
          <div class="db-info__row"><div class="db-info__label">Views</div><div class="db-info__value">${views.length}</div></div>
          <div class="db-info__row"><div class="db-info__label">Indexes</div><div class="db-info__value">${indexes.length}</div></div>
          ${tables.length > 0 ? `
            <div class="db-info__row"><div class="db-info__label">Table Names</div><div class="db-info__value">${tables.map(t => TableView.escapeHTML(t)).join(', ')}</div></div>
          ` : ''}
          ${views.length > 0 ? `
            <div class="db-info__row"><div class="db-info__label">View Names</div><div class="db-info__value">${views.map(v => TableView.escapeHTML(v)).join(', ')}</div></div>
          ` : ''}
        </div>

        <div class="db-info__section">
          <div class="db-info__section-title">Full Schema</div>
          <div class="schema-block">${TableView.escapeHTML(schema || 'No schema available.')}</div>
        </div>
      </div>
    `;
  }

  // --- File Handling ---

  function triggerFileOpen() {
    if (Database.isLoaded() && Database.isModified()) {
      showModal({
        title: 'Unsaved Changes',
        icon: 'warning',
        iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        body: '<p>Opening a new file will discard your current unsaved changes. Are you sure?</p>',
        size: 'sm',
        buttons: [
          { label: 'Cancel', class: 'btn btn--ghost', close: true },
          {
            label: 'Open New File', class: 'btn btn--primary', action: () => {
              closeModal();
              document.getElementById('file-input').click();
            }
          }
        ]
      });
    } else {
      document.getElementById('file-input').click();
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) openFile(file);
    e.target.value = ''; // Reset so same file can be reselected
  }

  function handleFileDrop(e) {
    const file = e.dataTransfer.files[0];
    if (file) {
      if (Database.isLoaded() && Database.isModified()) {
        showModal({
          title: 'Unsaved Changes',
          icon: 'warning',
          iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
          body: '<p>Opening a new file will discard your current unsaved changes. Are you sure?</p>',
          size: 'sm',
          buttons: [
            { label: 'Cancel', class: 'btn btn--ghost', close: true },
            { label: 'Open New File', class: 'btn btn--primary', action: () => { closeModal(); openFile(file); } }
          ]
        });
      } else {
        openFile(file);
      }
    }
  }

  async function openFile(file) {
    // Update status
    setTopBarStatus('loading', 'Loading...');

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Size warning
      if (arrayBuffer.byteLength > 200 * 1024 * 1024) {
        Notifications.warning('Large file', 'This file is very large and may cause performance issues in the browser.');
      }

      const info = await Database.open(arrayBuffer, file.name);
      Notifications.success('Database opened', `${file.name} loaded successfully.`);

      updateTopBar();
      refreshSidebar();
      SearchFilter.reset();
      showSection('overview');
    } catch (e) {
      setTopBarStatus('error', 'Error');
      Notifications.error('Failed to open database', e.message);

      // Show error in main content
      const container = document.getElementById('main-content');
      container.innerHTML = `
        <div class="welcome">
          <div class="welcome__icon" style="background:var(--clr-error);">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 class="welcome__title">Unable to open file</h2>
          <p class="welcome__subtitle">${TableView.escapeHTML(e.message)}</p>
          <button class="btn btn--primary" onclick="App.triggerFileOpen()">Try Another File</button>
        </div>
      `;
    }
  }

  async function loadSampleDB() {
    setTopBarStatus('loading', 'Generating sample DB...');
    try {
      const info = await Database.loadSampleDatabase();
      Notifications.success('Demo Database Loaded', 'Sample e-commerce database with 5 tables and 1 view loaded.');
      updateTopBar();
      refreshSidebar();
      SearchFilter.reset();
      showSection('overview');
    } catch (e) {
      setTopBarStatus('error', 'Error');
      Notifications.error('Failed to load sample database', e.message);
    }
  }

  function handleLoadSampleDB() {
    if (Database.isLoaded() && Database.isModified()) {
      showModal({
        title: 'Unsaved Changes',
        icon: 'warning',
        iconSvg: ICONS.save,
        body: '<p>You have unsaved changes in the current database. Loading the demo database will discard them. Do you wish to proceed?</p>',
        size: 'sm',
        buttons: [
          { label: 'Cancel', class: 'btn btn--ghost', close: true },
          { label: 'Load Demo DB', class: 'btn btn--primary', action: () => { closeModal(); loadSampleDB(); } }
        ]
      });
    } else {
      loadSampleDB();
    }
  }

  function downloadModifiedDB() {
    if (!Database.isLoaded()) {
      Notifications.warning('No database', 'No database is loaded.');
      return;
    }

    try {
      const bytes = Database.exportDatabase();
      const info = Database.getInfo();
      ExportManager.downloadDatabase(bytes, info.filename);
      Notifications.success('Database saved', 'Modified database downloaded successfully.');
    } catch (e) {
      Notifications.error('Save failed', e.message);
    }
  }

  // --- UI State Updates ---

  function updateTopBar() {
    const info = Database.getInfo();
    if (!info) {
      document.getElementById('topbar-filename').textContent = 'No database loaded';
      document.getElementById('topbar-filesize').textContent = '';
      setTopBarStatus('idle', 'Idle');
      document.getElementById('btn-save-db').classList.add('hidden');
      document.getElementById('btn-reset-db').classList.add('hidden');
      return;
    }

    document.getElementById('topbar-filename').textContent = info.filename;
    document.getElementById('topbar-filesize').textContent = TableView.formatBytes(info.fileSize);

    if (info.modified) {
      setTopBarStatus('modified', 'Unsaved changes');
    } else {
      setTopBarStatus('ready', 'Database ready');
    }

    document.getElementById('btn-save-db').classList.remove('hidden');
    document.getElementById('btn-reset-db').classList.toggle('hidden', !info.modified);
  }

  function setTopBarStatus(type, text) {
    const statusEl = document.getElementById('topbar-status');
    statusEl.className = `topbar__status topbar__status--${type}`;
    document.getElementById('topbar-status-text').textContent = text;
  }

  function refreshSidebar() {
    if (!Database.isLoaded()) {
      document.getElementById('sidebar-table-count').textContent = '0';
      document.getElementById('sidebar-tables-label').style.display = 'none';
      document.getElementById('sidebar-tables').innerHTML = '';
      return;
    }

    const tables = Database.getTables();
    document.getElementById('sidebar-table-count').textContent = tables.length;

    if (tables.length > 0) {
      document.getElementById('sidebar-tables-label').style.display = '';
      const currentTable = TableView.getCurrentTable();
      document.getElementById('sidebar-tables').innerHTML = tables.map(t => {
        let count = '';
        try {
          if (tables.length <= 50) {
            count = Database.getRowCount(t).toLocaleString();
          }
        } catch (_) {}
        return `
          <div class="sidebar__table-item ${t === currentTable ? 'sidebar__table-item--active' : ''}" data-sidebar-table="${TableView.escapeHTML(t)}">
            ${ICONS.tableIcon}
            <span class="sidebar__table-name">${TableView.escapeHTML(t)}</span>
            ${count ? `<span class="sidebar__table-count">${count}</span>` : ''}
          </div>
        `;
      }).join('');

      // Bind table clicks
      document.querySelectorAll('[data-sidebar-table]').forEach(el => {
        el.addEventListener('click', () => {
          openTable(el.dataset.sidebarTable);
          closeSidebar();
        });
      });
    } else {
      document.getElementById('sidebar-tables-label').style.display = 'none';
      document.getElementById('sidebar-tables').innerHTML = '';
    }
  }

  function updateStatusBar() {
    const table = TableView.getCurrentTable();
    if (table) {
      document.getElementById('status-table-text').textContent = table;
      const total = TableView.getTotalRows();
      document.getElementById('status-rows').style.display = '';
      document.getElementById('status-rows-text').textContent = `${total.toLocaleString()} rows`;
    } else {
      document.getElementById('status-table-text').textContent = 'No table selected';
      document.getElementById('status-rows').style.display = 'none';
    }

    document.getElementById('status-modified').style.display = Database.isModified() ? '' : 'none';
  }

  function openTable(tableName) {
    currentSection = 'tables';
    document.querySelectorAll('.sidebar__item[data-section]').forEach(item => {
      item.classList.toggle('sidebar__item--active', item.dataset.section === 'tables');
    });
    SearchFilter.reset();
    TableView.loadTable(tableName);
    refreshSidebar();
  }

  // --- Sidebar ---
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.getElementById('sidebar').classList.toggle('sidebar--open', sidebarOpen);
  }

  function closeSidebar() {
    sidebarOpen = false;
    document.getElementById('sidebar').classList.remove('sidebar--open');
  }

  // --- Modal System ---

  function showModal({ title, icon, iconSvg, body, size, buttons = [] }) {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modal-overlay');

    let sizeClass = '';
    if (size === 'lg') sizeClass = 'modal--lg';
    if (size === 'sm') sizeClass = 'modal--sm';

    const iconClass = icon === 'danger' ? 'modal__header-icon--danger' :
                      icon === 'warning' ? 'modal__header-icon--warning' :
                      'modal__header-icon--primary';

    modal.className = `modal ${sizeClass}`;
    modal.innerHTML = `
      <div class="modal__header">
        ${iconSvg ? `<div class="modal__header-icon ${iconClass}">${iconSvg}</div>` : ''}
        <div class="modal__title">${TableView.escapeHTML(title)}</div>
        <button class="modal__close" id="modal-close-btn" aria-label="Close dialog">${ICONS.close}</button>
      </div>
      <div class="modal__body">${body}</div>
      ${buttons.length > 0 ? `
        <div class="modal__footer">
          ${buttons.map((b, i) => `<button class="${b.class}" id="modal-btn-${i}">${b.label}</button>`).join('')}
        </div>
      ` : ''}
    `;

    overlay.classList.add('modal-overlay--visible');

    // Bind close button
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);

    // Bind action buttons
    buttons.forEach((b, i) => {
      const btn = document.getElementById(`modal-btn-${i}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (b.action) b.action();
          if (b.close) closeModal();
        });
      }
    });

    // Focus trap - focus first button
    const firstBtn = modal.querySelector('.modal__footer button, .modal__close');
    if (firstBtn) firstBtn.focus();
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('modal-overlay--visible');
  }

  return {
    init, showSection, showModal, closeModal,
    updateTopBar, refreshSidebar, updateStatusBar,
    openTable, triggerFileOpen, downloadModifiedDB,
    setTopBarStatus
  };
})();
