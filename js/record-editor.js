/**
 * record-editor.js - Add, Edit, Delete record forms
 */
const RecordEditor = (() => {

  /**
   * Show the Add Record form.
   */
  function showAddForm(tableName, columns, onComplete) {
    let bodyHtml = '<form id="add-record-form">';

    for (const col of columns) {
      const isAutoIncPK = col.primaryKey && col.type.toUpperCase().includes('INTEGER');
      const required = col.notNull && col.defaultValue === null && !isAutoIncPK;

      bodyHtml += `
        <div class="form-group">
          <label class="form-label" for="add-field-${col.cid}">
            ${TableView.escapeHTML(col.name)}
            <span class="form-label__type">${TableView.escapeHTML(col.type)}</span>
            ${col.primaryKey ? '<span class="form-label__type" style="color:var(--clr-primary);">PK</span>' : ''}
            ${required ? '<span class="form-label__required">*</span>' : ''}
          </label>
          ${isAutoIncPK ? `
            <input type="text" class="form-input form-input--mono" id="add-field-${col.cid}" data-column="${TableView.escapeHTML(col.name)}" placeholder="Auto-generated (leave empty)" aria-label="${col.name}">
            <div class="form-hint">Auto-increment primary key. Leave empty to auto-generate.</div>
          ` : `
            <div style="display:flex;gap:var(--sp-2);align-items:center;">
              <input type="text" class="form-input form-input--mono" id="add-field-${col.cid}"
                data-column="${TableView.escapeHTML(col.name)}"
                ${col.defaultValue !== null ? `placeholder="Default: ${TableView.escapeHTML(String(col.defaultValue))}"` : `placeholder="${col.notNull ? 'Required' : 'NULL if empty'}"`}
                ${required ? 'required' : ''}
                aria-label="${col.name}">
              ${!col.notNull ? `
                <label class="form-checkbox" style="flex-shrink:0;">
                  <input type="checkbox" class="null-checkbox" data-field="add-field-${col.cid}">
                  NULL
                </label>
              ` : ''}
            </div>
            ${col.defaultValue !== null ? `<div class="form-hint">Default: ${TableView.escapeHTML(String(col.defaultValue))}</div>` : ''}
          `}
        </div>
      `;
    }

    bodyHtml += '</form>';

    App.showModal({
      title: `Add Record: ${tableName}`,
      icon: 'primary',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      body: bodyHtml,
      size: 'lg',
      buttons: [
        { label: 'Cancel', class: 'btn btn--ghost', close: true },
        {
          label: 'Insert Record', class: 'btn btn--primary', action: () => {
            performInsert(tableName, columns, onComplete);
          }
        }
      ]
    });

    // Null checkbox behaviour
    bindNullCheckboxes();
  }

  /**
   * Show the Edit Record form.
   */
  function showEditForm(tableName, columns, rowValues, colNames, onComplete) {
    let bodyHtml = '<form id="edit-record-form">';

    for (let i = 0; i < colNames.length; i++) {
      const col = columns.find(c => c.name === colNames[i]);
      if (!col) continue;

      const val = rowValues[i];
      const isBinary = val instanceof Uint8Array || val instanceof ArrayBuffer;
      const isNull = val === null || val === undefined;
      const displayVal = isBinary ? '[BLOB data - cannot edit]' : (isNull ? '' : String(val));

      bodyHtml += `
        <div class="form-group">
          <label class="form-label" for="edit-field-${col.cid}">
            ${TableView.escapeHTML(col.name)}
            <span class="form-label__type">${TableView.escapeHTML(col.type)}</span>
            ${col.primaryKey ? '<span class="form-label__type" style="color:var(--clr-primary);">PK</span>' : ''}
          </label>
          <div style="display:flex;gap:var(--sp-2);align-items:center;">
            <input type="text" class="form-input form-input--mono" id="edit-field-${col.cid}"
              data-column="${TableView.escapeHTML(col.name)}"
              value="${TableView.escapeHTML(displayVal)}"
              ${isBinary ? 'disabled' : ''}
              aria-label="${col.name}">
            ${!col.notNull ? `
              <label class="form-checkbox" style="flex-shrink:0;">
                <input type="checkbox" class="null-checkbox" data-field="edit-field-${col.cid}" ${isNull ? 'checked' : ''}>
                NULL
              </label>
            ` : ''}
          </div>
        </div>
      `;
    }

    bodyHtml += '</form>';

    App.showModal({
      title: `Edit Record: ${tableName}`,
      icon: 'primary',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      body: bodyHtml,
      size: 'lg',
      buttons: [
        { label: 'Cancel', class: 'btn btn--ghost', close: true },
        {
          label: 'Save Changes', class: 'btn btn--primary', action: () => {
            performUpdate(tableName, columns, rowValues, colNames, onComplete);
          }
        }
      ]
    });

    bindNullCheckboxes();
  }

  /**
   * Confirm and delete a record.
   */
  function confirmDelete(tableName, columns, rowValues, colNames, onComplete) {
    // Build a summary of the record
    const pkColumns = columns.filter(c => c.primaryKey);
    let summary = '';
    if (pkColumns.length > 0) {
      summary = pkColumns.map(pk => {
        const idx = colNames.indexOf(pk.name);
        const val = idx >= 0 ? rowValues[idx] : '?';
        return `${pk.name} = ${val === null ? 'NULL' : val}`;
      }).join(', ');
    } else {
      summary = colNames.slice(0, 3).map((c, i) => `${c} = ${rowValues[i] === null ? 'NULL' : rowValues[i]}`).join(', ');
    }

    App.showModal({
      title: 'Delete Record',
      icon: 'danger',
      iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
      body: `
        <p style="margin-bottom:var(--sp-3);">Are you sure you want to delete this record?</p>
        <div class="schema-block" style="max-height:80px;font-size:var(--fs-xs);">${TableView.escapeHTML(summary)}</div>
        <p style="margin-top:var(--sp-3);color:var(--clr-error);font-size:var(--fs-sm);">This action cannot be undone.</p>
      `,
      size: 'sm',
      buttons: [
        { label: 'Cancel', class: 'btn btn--ghost', close: true },
        {
          label: 'Delete Record', class: 'btn btn--danger', action: () => {
            performDelete(tableName, columns, rowValues, colNames, onComplete);
            App.closeModal();
          }
        }
      ]
    });
  }

  // --- Internal ---

  function performInsert(tableName, columns, onComplete) {
    const data = {};
    let hasError = false;

    for (const col of columns) {
      const input = document.getElementById(`add-field-${col.cid}`);
      if (!input) continue;

      const nullCheckbox = document.querySelector(`.null-checkbox[data-field="add-field-${col.cid}"]`);
      const isNull = nullCheckbox && nullCheckbox.checked;
      const isEmpty = input.value.trim() === '';

      const isAutoIncPK = col.primaryKey && col.type.toUpperCase().includes('INTEGER');

      if (isAutoIncPK && isEmpty) {
        // Skip auto-increment PK
        continue;
      }

      if (isNull) {
        data[col.name] = null;
      } else if (isEmpty) {
        if (col.notNull && col.defaultValue === null && !isAutoIncPK) {
          Notifications.error('Validation error', `${col.name} is required and cannot be empty.`);
          input.focus();
          hasError = true;
          break;
        }
        if (col.defaultValue !== null) {
          continue; // Let DB use default
        }
        if (!col.notNull) {
          data[col.name] = null;
        } else {
          continue;
        }
      } else {
        data[col.name] = coerceValue(input.value, col.type);
      }
    }

    if (hasError) return;

    if (Object.keys(data).length === 0) {
      Notifications.warning('No data', 'Please fill in at least one field.');
      return;
    }

    try {
      const result = Database.insertRecord(tableName, data);
      Notifications.success('Record inserted', `${result.changes} row${result.changes !== 1 ? 's' : ''} added.`);
      App.closeModal();
      App.updateTopBar();
      App.refreshSidebar();
      if (onComplete) onComplete();
    } catch (e) {
      Notifications.error('Insert failed', e.message);
    }
  }

  function performUpdate(tableName, columns, originalRow, colNames, onComplete) {
    const data = {};
    const where = {};

    // Build WHERE from primary key or all original values
    const pkColumns = columns.filter(c => c.primaryKey);
    if (pkColumns.length > 0) {
      for (const pk of pkColumns) {
        const idx = colNames.indexOf(pk.name);
        if (idx >= 0) where[pk.name] = originalRow[idx];
      }
    } else {
      // No PK - use rowid if possible, or all columns
      for (let i = 0; i < colNames.length; i++) {
        if (!(originalRow[i] instanceof Uint8Array)) {
          where[colNames[i]] = originalRow[i];
        }
      }
    }

    for (let i = 0; i < colNames.length; i++) {
      const col = columns.find(c => c.name === colNames[i]);
      if (!col) continue;

      const input = document.getElementById(`edit-field-${col.cid}`);
      if (!input || input.disabled) continue;

      const nullCheckbox = document.querySelector(`.null-checkbox[data-field="edit-field-${col.cid}"]`);
      const isNull = nullCheckbox && nullCheckbox.checked;

      if (isNull) {
        data[col.name] = null;
      } else {
        data[col.name] = coerceValue(input.value, col.type);
      }
    }

    if (Object.keys(data).length === 0) {
      Notifications.warning('No changes', 'No fields were modified.');
      return;
    }

    try {
      const result = Database.updateRecord(tableName, data, where);
      if (result.changes === 0) {
        Notifications.warning('No rows affected', 'The record may have been modified or deleted by another operation.');
      } else if (result.changes > 1) {
        Notifications.warning('Multiple rows updated', `${result.changes} rows were updated. This may happen when the table has no unique primary key.`);
      } else {
        Notifications.success('Record updated', 'The record has been saved.');
      }
      App.closeModal();
      App.updateTopBar();
      if (onComplete) onComplete();
    } catch (e) {
      Notifications.error('Update failed', e.message);
    }
  }

  function performDelete(tableName, columns, rowValues, colNames, onComplete) {
    const where = {};
    const pkColumns = columns.filter(c => c.primaryKey);

    if (pkColumns.length > 0) {
      for (const pk of pkColumns) {
        const idx = colNames.indexOf(pk.name);
        if (idx >= 0) where[pk.name] = rowValues[idx];
      }
    } else {
      for (let i = 0; i < colNames.length; i++) {
        if (!(rowValues[i] instanceof Uint8Array)) {
          where[colNames[i]] = rowValues[i];
        }
      }
    }

    try {
      const result = Database.deleteRecord(tableName, where);
      Notifications.success('Record deleted', `${result.changes} row${result.changes !== 1 ? 's' : ''} removed.`);
      App.updateTopBar();
      App.refreshSidebar();
      if (onComplete) onComplete();
    } catch (e) {
      Notifications.error('Delete failed', e.message);
    }
  }

  function coerceValue(str, type) {
    const t = type.toUpperCase();
    if (t.includes('INT')) {
      const n = parseInt(str, 10);
      return isNaN(n) ? str : n;
    }
    if (t.includes('REAL') || t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('NUMERIC') || t.includes('DECIMAL')) {
      const n = parseFloat(str);
      return isNaN(n) ? str : n;
    }
    return str;
  }

  function bindNullCheckboxes() {
    document.querySelectorAll('.null-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const fieldId = cb.dataset.field;
        const input = document.getElementById(fieldId);
        if (input) {
          if (cb.checked) {
            input.value = '';
            input.disabled = true;
            input.placeholder = 'NULL';
          } else {
            input.disabled = false;
            input.placeholder = '';
          }
        }
      });

      // Initialize
      if (cb.checked) {
        const fieldId = cb.dataset.field;
        const input = document.getElementById(fieldId);
        if (input) { input.disabled = true; input.placeholder = 'NULL'; }
      }
    });
  }

  return { showAddForm, showEditForm, confirmDelete };
})();
