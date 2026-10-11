/**
 * search-filter.js - Column filter management
 */
const SearchFilter = (() => {
  let activeFilters = [];
  let panelVisible = false;
  let currentTable = '';
  let currentColumns = [];
  let onChangeCallback = null;

  const OPERATORS = {
    text: [
      { value: 'contains', label: 'Contains' },
      { value: 'exact', label: 'Exact match' },
      { value: 'starts_with', label: 'Starts with' },
      { value: 'is_null', label: 'Is NULL' },
      { value: 'not_null', label: 'Is NOT NULL' }
    ],
    number: [
      { value: 'eq', label: 'Equals' },
      { value: 'gt', label: 'Greater than' },
      { value: 'lt', label: 'Less than' },
      { value: 'between', label: 'Between' },
      { value: 'is_null', label: 'Is NULL' },
      { value: 'not_null', label: 'Is NOT NULL' }
    ]
  };

  function getActiveFilters() {
    return activeFilters;
  }

  function togglePanel(tableName, columns, onChange) {
    currentTable = tableName;
    currentColumns = columns;
    onChangeCallback = onChange;

    if (panelVisible && document.getElementById('filter-panel')) {
      hidePanel();
    } else {
      showPanel();
    }
  }

  function showPanel() {
    panelVisible = true;
    const container = document.getElementById('filter-panel-container');
    if (!container) return;

    renderPanel(container);
  }

  function hidePanel() {
    panelVisible = false;
    const container = document.getElementById('filter-panel-container');
    if (container) container.innerHTML = '';
  }

  function renderPanel(container) {
    let html = `
      <div class="filter-panel" id="filter-panel">
        <div class="filter-panel__header">
          <div class="filter-panel__title">Column Filters</div>
          <div style="display:flex;gap:var(--sp-2);align-items:center;">
            ${activeFilters.length > 0 ? `<span class="filter-panel__count">${activeFilters.length} active</span>` : ''}
            <button class="btn btn--ghost btn--sm" id="btn-clear-all-filters" ${activeFilters.length === 0 ? 'disabled' : ''}>Clear All</button>
            <button class="btn btn--ghost btn--sm" id="btn-add-filter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Filter
            </button>
          </div>
        </div>
        <div id="filter-rows">
    `;

    for (let i = 0; i < activeFilters.length; i++) {
      html += renderFilterRow(i, activeFilters[i]);
    }

    if (activeFilters.length === 0) {
      html += '<div class="text-sm text-muted" style="padding:var(--sp-2) 0;">No filters applied. Click "Add Filter" to add a column filter.</div>';
    }

    html += '</div></div>';
    container.innerHTML = html;

    bindFilterEvents();
  }

  function renderFilterRow(index, filter) {
    const colType = getColumnType(filter.column);
    const operators = colType === 'number' ? OPERATORS.number : OPERATORS.text;
    const needsValue = !['is_null', 'not_null'].includes(filter.operator);
    const needsRange = filter.operator === 'between';

    return `
      <div class="filter-row" data-filter-index="${index}">
        <select class="filter-col-select" data-index="${index}" aria-label="Filter column">
          <option value="">Select column</option>
          ${currentColumns.map(c =>
            `<option value="${TableView.escapeHTML(c.name)}" ${filter.column === c.name ? 'selected' : ''}>${TableView.escapeHTML(c.name)} (${c.type})</option>`
          ).join('')}
        </select>
        <select class="filter-op-select" data-index="${index}" aria-label="Filter operator">
          ${operators.map(op =>
            `<option value="${op.value}" ${filter.operator === op.value ? 'selected' : ''}>${op.label}</option>`
          ).join('')}
        </select>
        ${needsRange ? `
          <input type="text" class="filter-value-min" data-index="${index}" placeholder="Min" value="${TableView.escapeHTML(filter.valueMin || '')}" aria-label="Minimum value">
          <input type="text" class="filter-value-max" data-index="${index}" placeholder="Max" value="${TableView.escapeHTML(filter.valueMax || '')}" aria-label="Maximum value">
        ` : needsValue ? `
          <input type="text" class="filter-value" data-index="${index}" placeholder="Value" value="${TableView.escapeHTML(filter.value || '')}" aria-label="Filter value">
        ` : ''}
        <button class="btn btn--ghost btn--sm filter-remove-btn" data-index="${index}" title="Remove filter" aria-label="Remove filter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  }

  function bindFilterEvents() {
    // Add filter
    const btnAdd = document.getElementById('btn-add-filter');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        activeFilters.push({ column: currentColumns[0]?.name || '', operator: 'contains', value: '' });
        refreshPanel();
      });
    }

    // Clear all
    const btnClear = document.getElementById('btn-clear-all-filters');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        activeFilters = [];
        refreshPanel();
        if (onChangeCallback) onChangeCallback();
      });
    }

    // Column selects
    document.querySelectorAll('.filter-col-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.index);
        activeFilters[idx].column = sel.value;
        // Reset operator if type changed
        const colType = getColumnType(sel.value);
        const ops = colType === 'number' ? OPERATORS.number : OPERATORS.text;
        if (!ops.find(o => o.value === activeFilters[idx].operator)) {
          activeFilters[idx].operator = ops[0].value;
        }
        refreshPanel();
      });
    });

    // Operator selects
    document.querySelectorAll('.filter-op-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.index);
        activeFilters[idx].operator = sel.value;
        refreshPanel();
      });
    });

    // Value inputs
    document.querySelectorAll('.filter-value').forEach(inp => {
      let debounce = null;
      inp.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const idx = parseInt(inp.dataset.index);
          activeFilters[idx].value = inp.value;
          if (onChangeCallback) onChangeCallback();
        }, 400);
      });
    });

    // Range inputs
    document.querySelectorAll('.filter-value-min, .filter-value-max').forEach(inp => {
      let debounce = null;
      inp.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const idx = parseInt(inp.dataset.index);
          if (inp.classList.contains('filter-value-min')) {
            activeFilters[idx].valueMin = inp.value;
          } else {
            activeFilters[idx].valueMax = inp.value;
          }
          if (onChangeCallback) onChangeCallback();
        }, 400);
      });
    });

    // Remove buttons
    document.querySelectorAll('.filter-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        activeFilters.splice(idx, 1);
        refreshPanel();
        if (onChangeCallback) onChangeCallback();
      });
    });

    // Also trigger change for null/not-null operators
    document.querySelectorAll('.filter-op-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.index);
        const op = sel.value;
        if (op === 'is_null' || op === 'not_null') {
          if (onChangeCallback) onChangeCallback();
        }
      });
    });
  }

  function refreshPanel() {
    const container = document.getElementById('filter-panel-container');
    if (container && panelVisible) renderPanel(container);
  }

  function getColumnType(colName) {
    const col = currentColumns.find(c => c.name === colName);
    if (!col) return 'text';
    const t = col.type.toUpperCase();
    if (t.includes('INT') || t.includes('REAL') || t.includes('FLOAT') || t.includes('DOUBLE')
        || t.includes('NUMERIC') || t.includes('DECIMAL')) {
      return 'number';
    }
    return 'text';
  }

  function reset() {
    activeFilters = [];
    panelVisible = false;
  }

  return { getActiveFilters, togglePanel, showPanel, hidePanel, reset };
})();
