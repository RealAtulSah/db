/**
 * database.js - SQLite database adapter using SQL.js
 *
 * Manages database lifecycle: open, query, modify, export, close.
 * Keeps original bytes for reset capability.
 */
const Database = (() => {
  let db = null;
  let originalBytes = null;
  let filename = '';
  let fileSize = 0;
  let format = null;
  let modified = false;
  let SQL = null;

  /**
   * Initialise SQL.js (load WASM).
   */
  async function initSqlJs() {
    if (SQL) return;
    SQL = await initSqlJs_loader({
      locateFile: file => `lib/${file}`
    });
  }

  /**
   * Open a database from an ArrayBuffer.
   */
  async function open(arrayBuffer, name) {
    await initSqlJs();
    close(); // close any existing

    const bytes = new Uint8Array(arrayBuffer);

    // Detect format
    const headerBytes = bytes.slice(0, 256);
    format = FormatDetector.detect(headerBytes, name);

    if (!format.supported) {
      throw new Error(`Unsupported format: ${format.name}. ${format.info}`);
    }

    // Handle .sql script / dump files
    if (format.isSqlScript || name.toLowerCase().endsWith('.sql')) {
      const sqlText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      db = new SQL.Database();

      try {
        executeSqlScript(sqlText);
      } catch (e) {
        throw new Error(`Failed to load SQL file: ${e.message}`);
      }

      originalBytes = db.export();
      filename = name;
      fileSize = bytes.length;
      format = {
        name: 'SQL Script (.sql)',
        supported: true,
        info: 'SQL script loaded and converted into in-memory SQLite database.'
      };
      modified = false;
      return getInfo();
    }

    // Validate SQLite header
    const validation = FormatDetector.validateSQLiteHeader(headerBytes);
    if (!validation.valid) {
      throw new Error(`Invalid SQLite file: ${validation.reason}`);
    }

    try {
      db = new SQL.Database(bytes);
    } catch (e) {
      throw new Error(`Failed to open database: ${e.message}`);
    }

    originalBytes = bytes.slice(); // keep copy for reset
    filename = name;
    fileSize = bytes.length;
    modified = false;

    return getInfo();
  }

  /**
   * Load a rich sample e-commerce database for instant interactive exploration.
   */
  async function loadSampleDatabase() {
    await initSqlJs();
    close();

    db = new SQL.Database();

    const sampleSQL = `
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT
      );

      INSERT INTO categories (id, name, slug, description) VALUES
      (1, 'Electronics', 'electronics', 'Smart devices, computer hardware and peripherals'),
      (2, 'Audio & Video', 'audio-video', 'Studio headphones, speakers and audio equipment'),
      (3, 'Office Furniture', 'office-furniture', 'Ergonomic seating, height-adjustable desks and lighting'),
      (4, 'Accessories', 'accessories', 'Cables, high-speed docks, chargers and laptop stands'),
      (5, 'Books & Guides', 'books-guides', 'Software architecture, database design and AI textbooks');

      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        sku TEXT UNIQUE NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        rating REAL DEFAULT 4.5,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      INSERT INTO products (id, name, category_id, sku, price, stock, rating, is_active) VALUES
      (1, 'UltraWide 38" Curved Monitor', 1, 'MON-UW-38', 899.99, 14, 4.8, 1),
      (2, 'Mechanical Keyboard (Linear Switches)', 1, 'KB-MECH-RGB', 149.50, 42, 4.7, 1),
      (3, 'Precision Ergonomic Mouse', 1, 'MOU-ERG-PR', 79.99, 65, 4.6, 1),
      (4, 'Thunderbolt 4 Docking Station', 1, 'DCK-TB4-PRO', 249.00, 28, 4.9, 1),
      (5, '4K Ultra HD Streaming Webcam', 1, 'CAM-4K-UHD', 129.99, 35, 4.5, 1),
      (6, 'Active Noise-Cancelling Headphones', 2, 'AUD-ANC-HP', 299.95, 22, 4.9, 1),
      (7, 'Studio Desktop Reference Monitors', 2, 'AUD-SPK-STD', 189.00, 18, 4.6, 1),
      (8, 'USB-C Cardioid Condenser Microphone', 2, 'MIC-USB-CRD', 119.50, 40, 4.7, 1),
      (9, 'Wireless Earbuds with Transparency', 2, 'AUD-BUD-WL', 159.00, 50, 4.4, 1),
      (10, 'Ergonomic Mesh Task Chair', 3, 'CHR-MSH-PRO', 449.00, 12, 4.8, 1),
      (11, 'Dual-Motor Standing Desk (160x80cm)', 3, 'DSK-SIT-STD', 599.00, 8, 4.9, 1),
      (12, 'Anti-Fatigue Standing Mat', 3, 'MAT-ERG-60', 49.99, 75, 4.5, 1),
      (13, 'LED Monitor Light Bar', 3, 'LGT-BAR-MN', 69.95, 60, 4.7, 1),
      (14, 'Braided 100W USB-C Cable (2m)', 4, 'CAB-USBC-2M', 18.99, 120, 4.8, 1),
      (15, 'Aluminum Laptop Riser Stand', 4, 'ACC-STD-ALU', 39.99, 85, 4.6, 1),
      (16, 'MagSafe Dual Wireless Charger', 4, 'CHG-MAG-2IN1', 59.50, 45, 4.3, 1),
      (17, 'Cable Management Routing Kit', 4, 'ACC-CBL-MGT', 24.99, 110, 4.5, 1),
      (18, 'Designing Data-Intensive Applications', 5, 'BK-DDIA-ORE', 44.99, 30, 4.9, 1),
      (19, 'Database Internals: Storage Engines', 5, 'BK-DBINT-ORE', 49.50, 25, 4.8, 1),
      (20, 'System Design Interview Handbook', 5, 'BK-SYS-DSN', 39.00, 40, 4.7, 1);

      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        city TEXT,
        country TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT '2026-02-15 10:00:00'
      );

      INSERT INTO customers (id, name, email, phone, city, country, status, created_at) VALUES
      (1, 'Alex Rivera', 'alex.rivera@example.com', '+1-555-0101', 'San Francisco', 'United States', 'active', '2026-01-15 10:20:00'),
      (2, 'Sophie Dubois', 'sophie.dubois@example.fr', '+33-1-4005-0102', 'Paris', 'France', 'active', '2026-01-20 14:35:00'),
      (3, 'Kenji Takahashi', 'kenji.takahashi@example.jp', '+81-3-5555-0103', 'Tokyo', 'Japan', 'active', '2026-02-01 09:15:00'),
      (4, 'Elena Rostov', 'elena.rostov@example.de', '+49-30-5555-0104', 'Berlin', 'Germany', 'active', '2026-02-05 11:45:00'),
      (5, 'Marcus Vance', 'marcus.vance@example.co.uk', '+44-20-7946-0105', 'London', 'United Kingdom', 'active', '2026-02-10 16:20:00'),
      (6, 'Priya Sharma', 'priya.sharma@example.in', '+91-22-5555-0106', 'Bengaluru', 'India', 'active', '2026-02-15 13:10:00'),
      (7, 'Liam O''Connor', 'liam.oconnor@example.ie', '+353-1-496-0107', 'Dublin', 'Ireland', 'active', '2026-02-20 17:00:00'),
      (8, 'Camila Santos', 'camila.santos@example.br', '+55-11-5555-0108', 'Sao Paulo', 'Brazil', 'active', '2026-02-25 10:50:00'),
      (9, 'Lucas Meyer', 'lucas.meyer@example.ch', '+41-22-5555-0109', 'Zurich', 'Switzerland', 'inactive', '2026-03-01 08:30:00'),
      (10, 'Hanna Lindqvist', 'hanna.l@example.se', '+46-8-5555-0110', 'Stockholm', 'Sweden', 'active', '2026-03-05 15:40:00'),
      (11, 'David Chen', 'david.chen@example.ca', '+1-416-555-0111', 'Toronto', 'Canada', 'active', '2026-03-10 12:25:00'),
      (12, 'Fatima Al-Mansoor', 'fatima.m@example.ae', '+971-4-555-0112', 'Dubai', 'UAE', 'active', '2026-03-12 18:05:00'),
      (13, 'Matteo Rossi', 'matteo.rossi@example.it', '+39-06-5555-0113', 'Milan', 'Italy', 'active', '2026-03-15 11:15:00'),
      (14, 'Chloe Zhang', 'chloe.zhang@example.sg', '+65-6555-0114', 'Singapore', 'Singapore', 'active', '2026-03-18 14:50:00'),
      (15, 'Diego Morales', 'diego.m@example.mx', '+52-55-5555-0115', 'Mexico City', 'Mexico', 'active', '2026-03-22 09:40:00');

      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        order_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('completed', 'shipped', 'processing', 'pending', 'cancelled')),
        total_amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        shipping_city TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );

      INSERT INTO orders (id, customer_id, order_date, status, total_amount, payment_method, shipping_city) VALUES
      (1, 1, '2026-03-01', 'completed', 1049.49, 'Credit Card', 'San Francisco'),
      (2, 2, '2026-03-02', 'completed', 299.95, 'PayPal', 'Paris'),
      (3, 3, '2026-03-03', 'shipped', 678.99, 'Credit Card', 'Tokyo'),
      (4, 4, '2026-03-04', 'completed', 899.99, 'Wire Transfer', 'Berlin'),
      (5, 5, '2026-03-05', 'shipped', 129.99, 'Credit Card', 'London'),
      (6, 6, '2026-03-06', 'completed', 169.49, 'Credit Card', 'Bengaluru'),
      (7, 7, '2026-03-07', 'processing', 648.99, 'Apple Pay', 'Dublin'),
      (8, 8, '2026-03-08', 'shipped', 79.99, 'Credit Card', 'Sao Paulo'),
      (9, 10, '2026-03-09', 'completed', 449.00, 'Credit Card', 'Stockholm'),
      (10, 11, '2026-03-10', 'processing', 267.99, 'PayPal', 'Toronto'),
      (11, 12, '2026-03-11', 'shipped', 94.49, 'Credit Card', 'Dubai'),
      (12, 13, '2026-03-12', 'pending', 599.00, 'Wire Transfer', 'Milan'),
      (13, 14, '2026-03-13', 'completed', 389.00, 'Credit Card', 'Singapore'),
      (14, 15, '2026-03-14', 'cancelled', 899.99, 'Credit Card', 'Mexico City'),
      (15, 1, '2026-03-15', 'completed', 149.50, 'Apple Pay', 'San Francisco'),
      (16, 2, '2026-03-16', 'shipped', 39.99, 'PayPal', 'Paris'),
      (17, 3, '2026-03-17', 'completed', 119.50, 'Credit Card', 'Tokyo'),
      (18, 5, '2026-03-18', 'completed', 44.99, 'Credit Card', 'London'),
      (19, 6, '2026-03-19', 'shipped', 249.00, 'Credit Card', 'Bengaluru'),
      (20, 11, '2026-03-20', 'processing', 159.00, 'PayPal', 'Toronto');

      CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
      (1, 1, 1, 1, 899.99),
      (2, 1, 2, 1, 149.50),
      (3, 2, 6, 1, 299.95),
      (4, 3, 11, 1, 599.00),
      (5, 3, 3, 1, 79.99),
      (6, 4, 1, 1, 899.99),
      (7, 5, 5, 1, 129.99),
      (8, 6, 2, 1, 149.50),
      (9, 6, 14, 1, 18.99),
      (10, 7, 11, 1, 599.00),
      (11, 7, 12, 1, 49.99),
      (12, 8, 3, 1, 79.99),
      (13, 9, 10, 1, 449.00),
      (14, 10, 4, 1, 249.00),
      (15, 10, 14, 1, 18.99),
      (16, 11, 13, 1, 69.95),
      (17, 11, 17, 1, 24.99),
      (18, 12, 11, 1, 599.00),
      (19, 13, 6, 1, 299.95),
      (20, 13, 15, 1, 39.99),
      (21, 13, 18, 1, 44.99),
      (22, 14, 1, 1, 899.99),
      (23, 15, 2, 1, 149.50),
      (24, 16, 15, 1, 39.99),
      (25, 17, 8, 1, 119.50),
      (26, 18, 18, 1, 44.99),
      (27, 19, 4, 1, 249.00),
      (28, 20, 9, 1, 159.00);

      CREATE INDEX idx_products_category ON products(category_id);
      CREATE INDEX idx_orders_customer ON orders(customer_id);
      CREATE INDEX idx_orders_date ON orders(order_date);
      CREATE INDEX idx_order_items_order ON order_items(order_id);

      CREATE VIEW v_customer_order_summary AS
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.email,
        c.country,
        COUNT(o.id) AS total_orders,
        ROUND(COALESCE(SUM(o.total_amount), 0), 2) AS total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id, c.name, c.email, c.country
      ORDER BY total_spent DESC;
    `;

    db.exec(sampleSQL);

    originalBytes = db.export();
    filename = 'sample_ecommerce.db';
    fileSize = originalBytes.length;
    format = { name: 'SQLite 3.x', supported: true, info: 'In-memory sample store database' };
    modified = false;

    return getInfo();
  }

  /**
   * Close the current database and release memory.
   */
  function close() {
    if (db) {
      try { db.close(); } catch (_) {}
      db = null;
    }
    originalBytes = null;
    filename = '';
    fileSize = 0;
    format = null;
    modified = false;
  }

  /**
   * Check if a database is loaded.
   */
  function isLoaded() {
    return db !== null;
  }

  /**
   * Check if the database has been modified.
   */
  function isModified() {
    return modified;
  }

  /**
   * Mark database as modified.
   */
  function markModified() {
    modified = true;
  }

  /**
   * Get database info.
   */
  function getInfo() {
    if (!db) return null;
    return {
      filename,
      fileSize,
      format: format ? format.name : 'Unknown',
      formatInfo: format ? format.info : '',
      modified
    };
  }

  /**
   * Get all user tables.
   */
  function getTables() {
    if (!db) return [];
    const result = db.exec(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    if (!result.length) return [];
    return result[0].values.map(r => r[0]);
  }

  /**
   * Get all views.
   */
  function getViews() {
    if (!db) return [];
    const result = db.exec(`
      SELECT name FROM sqlite_master
      WHERE type='view'
      ORDER BY name
    `);
    if (!result.length) return [];
    return result[0].values.map(r => r[0]);
  }

  /**
   * Get all indexes.
   */
  function getIndexes() {
    if (!db) return [];
    const result = db.exec(`
      SELECT name, tbl_name FROM sqlite_master
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `);
    if (!result.length) return [];
    return result[0].values.map(r => ({ name: r[0], table: r[1] }));
  }

  /**
   * Get table column info.
   */
  function getTableInfo(tableName) {
    if (!db) return [];
    const safeName = escapeIdentifier(tableName);
    const result = db.exec(`PRAGMA table_info(${safeName})`);
    if (!result.length) return [];
    // columns: cid, name, type, notnull, dflt_value, pk
    return result[0].values.map(r => ({
      cid: r[0],
      name: r[1],
      type: r[2] || 'ANY',
      notNull: r[3] === 1,
      defaultValue: r[4],
      primaryKey: r[5] > 0,
      pkOrder: r[5]
    }));
  }

  /**
   * Get row count for a table.
   */
  function getRowCount(tableName) {
    if (!db) return 0;
    const safeName = escapeIdentifier(tableName);
    const result = db.exec(`SELECT COUNT(*) FROM ${safeName}`);
    if (!result.length) return 0;
    return result[0].values[0][0];
  }

  /**
   * Get table creation SQL.
   */
  function getTableSQL(tableName) {
    if (!db) return '';
    const result = db.exec(`SELECT sql FROM sqlite_master WHERE name = ?`, [tableName]);
    if (!result.length || !result[0].values.length) return '';
    return result[0].values[0][0] || '';
  }

  /**
   * Get full schema SQL.
   */
  function getFullSchema() {
    if (!db) return '';
    const result = db.exec(`SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name`);
    if (!result.length) return '';
    return result[0].values.map(r => r[0]).join(';\n\n') + ';';
  }

  /**
   * Execute a SELECT-like query with pagination.
   */
  function queryTable(tableName, { offset = 0, limit = 50, orderBy = null, orderDir = 'ASC',
                                    search = '', searchColumns = [],
                                    filters = [] } = {}) {
    if (!db) return { columns: [], rows: [], total: 0 };

    const safeName = escapeIdentifier(tableName);
    let whereClause = '';
    const params = [];

    // Build WHERE from filters
    const conditions = [];

    // Global search
    if (search && searchColumns.length > 0) {
      const searchConds = searchColumns.map(col => {
        params.push(`%${escapeLike(search)}%`);
        return `${escapeIdentifier(col)} LIKE ? ESCAPE '\\'`;
      });
      conditions.push(`(${searchConds.join(' OR ')})`);
    }

    // Column filters
    for (const f of filters) {
      const colId = escapeIdentifier(f.column);
      switch (f.operator) {
        case 'contains':
          params.push(`%${escapeLike(f.value)}%`);
          conditions.push(`${colId} LIKE ? ESCAPE '\\'`);
          break;
        case 'exact':
          params.push(f.value);
          conditions.push(`${colId} = ?`);
          break;
        case 'starts_with':
          params.push(`${escapeLike(f.value)}%`);
          conditions.push(`${colId} LIKE ? ESCAPE '\\'`);
          break;
        case 'eq':
          params.push(Number(f.value));
          conditions.push(`${colId} = ?`);
          break;
        case 'gt':
          params.push(Number(f.value));
          conditions.push(`${colId} > ?`);
          break;
        case 'lt':
          params.push(Number(f.value));
          conditions.push(`${colId} < ?`);
          break;
        case 'between':
          params.push(Number(f.valueMin), Number(f.valueMax));
          conditions.push(`${colId} BETWEEN ? AND ?`);
          break;
        case 'is_null':
          conditions.push(`${colId} IS NULL`);
          break;
        case 'not_null':
          conditions.push(`${colId} IS NOT NULL`);
          break;
      }
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Count
    const countResult = db.exec(`SELECT COUNT(*) FROM ${safeName} ${whereClause}`, params);
    const total = countResult.length ? countResult[0].values[0][0] : 0;

    // Order
    let orderClause = '';
    if (orderBy) {
      const dir = orderDir === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY ${escapeIdentifier(orderBy)} ${dir}`;
    }

    // Data
    const dataSQL = `SELECT * FROM ${safeName} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const dataParams = [...params, limit, offset];

    let columns = [];
    let rows = [];
    try {
      const stmt = db.prepare(dataSQL);
      stmt.bind(dataParams);

      // Get column names
      columns = stmt.getColumnNames();
      while (stmt.step()) {
        rows.push(stmt.get());
      }
      stmt.free();
    } catch (e) {
      throw new Error(`Query error: ${e.message}`);
    }

    return { columns, rows, total };
  }

  /**
   * Execute arbitrary SQL.
   * Returns { results: [...], changes: number, duration: number }
   */
  function executeSQL(sql) {
    if (!db) throw new Error('No database loaded.');

    const start = performance.now();
    let results = [];
    let changes = 0;
    let error = null;

    try {
      results = db.exec(sql);
      // Get changes count
      try {
        const ch = db.exec('SELECT changes()');
        if (ch.length) changes = ch[0].values[0][0];
      } catch (_) {}
    } catch (e) {
      error = e;
    }

    const duration = performance.now() - start;

    if (error) {
      throw new Error(error.message);
    }

    // Detect if it was a write operation
    if (isWriteOperation(sql)) {
      modified = true;
    }

    return { results, changes, duration };
  }

  /**
   * Insert a record into a table.
   */
  function insertRecord(tableName, data) {
    if (!db) throw new Error('No database loaded.');

    const columns = Object.keys(data);
    const values = Object.values(data);
    const safeName = escapeIdentifier(tableName);
    const colList = columns.map(c => escapeIdentifier(c)).join(', ');
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${safeName} (${colList}) VALUES (${placeholders})`;

    try {
      db.run(sql, values);
      modified = true;
      return { success: true, changes: db.getRowsModified() };
    } catch (e) {
      throw new Error(`Insert failed: ${e.message}`);
    }
  }

  /**
   * Update a record.
   * @param {string} tableName
   * @param {Object} data - column: value pairs to set
   * @param {Object} where - column: value pairs for WHERE (primary key)
   */
  function updateRecord(tableName, data, where) {
    if (!db) throw new Error('No database loaded.');

    const safeName = escapeIdentifier(tableName);
    const setClauses = [];
    const setValues = [];
    for (const [col, val] of Object.entries(data)) {
      setClauses.push(`${escapeIdentifier(col)} = ?`);
      setValues.push(val);
    }

    const whereClauses = [];
    const whereValues = [];
    for (const [col, val] of Object.entries(where)) {
      if (val === null) {
        whereClauses.push(`${escapeIdentifier(col)} IS NULL`);
      } else {
        whereClauses.push(`${escapeIdentifier(col)} = ?`);
        whereValues.push(val);
      }
    }

    const sql = `UPDATE ${safeName} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
    const params = [...setValues, ...whereValues];

    try {
      db.run(sql, params);
      const changes = db.getRowsModified();
      if (changes > 0) modified = true;
      return { success: true, changes };
    } catch (e) {
      throw new Error(`Update failed: ${e.message}`);
    }
  }

  /**
   * Delete record(s).
   */
  function deleteRecord(tableName, where) {
    if (!db) throw new Error('No database loaded.');

    const safeName = escapeIdentifier(tableName);
    const whereClauses = [];
    const whereValues = [];
    for (const [col, val] of Object.entries(where)) {
      if (val === null) {
        whereClauses.push(`${escapeIdentifier(col)} IS NULL`);
      } else {
        whereClauses.push(`${escapeIdentifier(col)} = ?`);
        whereValues.push(val);
      }
    }

    const sql = `DELETE FROM ${safeName} WHERE ${whereClauses.join(' AND ')}`;

    try {
      db.run(sql, whereValues);
      const changes = db.getRowsModified();
      if (changes > 0) modified = true;
      return { success: true, changes };
    } catch (e) {
      throw new Error(`Delete failed: ${e.message}`);
    }
  }

  /**
   * Export the current database as a Uint8Array.
   */
  function exportDatabase() {
    if (!db) throw new Error('No database loaded.');
    return db.export();
  }

  /**
   * Reset database to the original uploaded state.
   */
  function resetToOriginal() {
    if (!originalBytes) throw new Error('No original database available.');
    if (db) {
      try { db.close(); } catch (_) {}
    }
    db = new SQL.Database(originalBytes);
    modified = false;
  }

  /**
   * Get all data from a table (for export).
   * @param {string} tableName
   * @param {Object} opts - optional filters
   * @returns {{ columns: string[], rows: any[][] }}
   */
  function getAllTableData(tableName, opts = {}) {
    if (!db) return { columns: [], rows: [] };

    const safeName = escapeIdentifier(tableName);
    let sql = `SELECT * FROM ${safeName}`;
    const params = [];

    // Apply optional filters
    if (opts.whereClause) {
      sql += ` ${opts.whereClause}`;
      if (opts.params) params.push(...opts.params);
    }

    if (opts.orderBy) {
      sql += ` ORDER BY ${escapeIdentifier(opts.orderBy)} ${opts.orderDir || 'ASC'}`;
    }

    if (opts.limit) {
      sql += ` LIMIT ?`;
      params.push(opts.limit);
      if (opts.offset) {
        sql += ` OFFSET ?`;
        params.push(opts.offset);
      }
    }

    const result = db.exec(sql, params);
    if (!result.length) {
      // Get column names even for empty tables
      const colInfo = getTableInfo(tableName);
      return { columns: colInfo.map(c => c.name), rows: [] };
    }
    return { columns: result[0].columns, rows: result[0].values };
  }

  // --- Helpers ---

  /**
   * Parse and execute a full SQL script into SQLite.
   * Handles multi-statement scripts, escaped quotes (\' -> ''), and cleans common MySQL / PostgreSQL dump syntax.
   */
  function executeSqlScript(sqlText) {
    if (!db) throw new Error('Database not initialized');

    // 1. Normalize newlines
    let text = sqlText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Remove conditional MySQL comments /*!40101 ... */
    text = text.replace(/\/\*![0-9]*\s*([\s\S]*?)\*\//g, (match, p1) => {
      if (/^\s*(SET|CHARACTER|NAMES)\b/i.test(p1.trim())) return '';
      return p1;
    });

    // Remove standard multi-line comments /* ... */
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');

    // 3. Remove single-line comments (-- and #)
    const lines = text.split('\n');
    const filteredLines = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('--') || trimmed.startsWith('#')) {
        continue;
      }
      filteredLines.push(line);
    }
    text = filteredLines.join('\n');

    // 4. Split into statements respecting quoted strings
    const rawStatements = splitSqlStatements(text);
    let successCount = 0;
    let lastErr = null;

    for (let raw of rawStatements) {
      let stmt = raw.trim();
      if (!stmt) continue;

      // Skip directives that SQLite doesn't support
      if (/^(SET|LOCK|UNLOCK|USE|DELIMITER|ALTER\s+DATABASE|COMMIT|ROLLBACK|START\s+TRANSACTION|BEGIN\s+TRANSACTION|BEGIN\b)/i.test(stmt)) {
        continue;
      }
      if (/^ALTER\s+TABLE\s+[`"']?\w+[`"']?\s+(?:DISABLE|ENABLE)\s+KEYS/i.test(stmt)) {
        continue;
      }
      if (/^ALTER\s+TABLE\s+[`"']?\w+[`"']?\s+MODIFY/i.test(stmt)) {
        continue;
      }
      if (/^ALTER\s+TABLE\s+[`"']?\w+[`"']?\s+ADD\s+CONSTRAINT/i.test(stmt)) {
        continue;
      }

      // Convert ALTER TABLE ADD (UNIQUE) KEY to CREATE INDEX
      if (/^ALTER\s+TABLE\s+[`"']?(\w+)[`"']?\s+ADD\s+/i.test(stmt)) {
        const match = stmt.match(/^ALTER\s+TABLE\s+[`"']?(\w+)[`"']?\s+ADD\s+(.*)/is);
        if (match) {
          const tbl = match[1];
          const addPart = match[2];
          const keyMatches = addPart.matchAll(/(?:UNIQUE\s+)?KEY\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)/gi);
          let createdIndex = false;
          for (const km of keyMatches) {
            const isUnique = /UNIQUE/i.test(km[0]);
            const idxName = km[1];
            const cols = km[2];
            try {
              db.exec(`CREATE ${isUnique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS "${idxName}" ON "${tbl}" (${cols});`);
              createdIndex = true;
            } catch (_) {}
          }
          if (createdIndex || /ADD\s+PRIMARY\s+KEY/i.test(addPart)) {
            continue;
          }
        }
      }

      // Clean MySQL table options and constraints in CREATE TABLE
      if (/^CREATE\s+TABLE/i.test(stmt)) {
        stmt = cleanCreateTable(stmt);
      }

      // Convert MySQL backslash-escaped quotes to SQLite double single-quotes
      stmt = replaceEscapedQuotes(stmt);

      try {
        db.exec(stmt);
        successCount++;
      } catch (stmtErr) {
        lastErr = stmtErr;
      }
    }

    const tables = getTables();
    if (tables.length === 0 && successCount === 0) {
      throw new Error(`Could not parse SQL statements: ${lastErr ? lastErr.message : 'No valid statements executed'}`);
    }
  }

  /**
   * Replace backslash-escaped quotes in SQL literals (\' -> '')
   */
  function replaceEscapedQuotes(sql) {
    return sql.replace(/\\'/g, "''").replace(/\\"/g, '"');
  }

  /**
   * Clean MySQL and non-standard options from CREATE TABLE statements for SQLite compatibility.
   */
  function cleanCreateTable(sql) {
    let cleaned = sql;

    // Remove trailing table options like ENGINE=InnoDB DEFAULT CHARSET=...
    cleaned = cleaned.replace(/\)\s*(?:ENGINE|DEFAULT\s+CHARSET|CHARSET|COLLATE|AUTO_INCREMENT|ROW_FORMAT)[^;]*/gi, ')');

    // Remove MySQL-specific KEY definitions inside CREATE TABLE
    cleaned = cleaned.replace(/,\s*(?:FULLTEXT\s+|SPATIAL\s+)?KEY\s+[`"']?[A-Za-z0-9_]+[`"']?\s*\([^)]+\)/gi, '');
    cleaned = cleaned.replace(/UNIQUE\s+KEY\s+[`"']?[A-Za-z0-9_]+[`"']?\s*\(/gi, 'UNIQUE (');

    // Replace current_timestamp() with CURRENT_TIMESTAMP (SQLite doesn't allow parentheses in DEFAULT)
    cleaned = cleaned.replace(/DEFAULT\s+current_timestamp\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP');
    cleaned = cleaned.replace(/DEFAULT\s+current_date\(\)/gi, 'DEFAULT CURRENT_DATE');
    cleaned = cleaned.replace(/DEFAULT\s+current_time\(\)/gi, 'DEFAULT CURRENT_TIME');

    // Remove ON UPDATE CURRENT_TIMESTAMP
    cleaned = cleaned.replace(/ON\s+UPDATE\s+current_timestamp(?:\(\))?/gi, '');

    // Remove COMMENT '...'
    cleaned = cleaned.replace(/COMMENT\s+'[^']*'/gi, '');

    // Remove CHARACTER SET ... and COLLATE ...
    cleaned = cleaned.replace(/\bCHARACTER\s+SET\s+[A-Za-z0-9_]+/gi, '');
    cleaned = cleaned.replace(/\bCOLLATE\s+[A-Za-z0-9_]+/gi, '');

    // Remove CHECK (json_valid(...))
    cleaned = cleaned.replace(/CHECK\s*\(\s*json_valid\([^)]+\)\s*\)/gi, '');

    // Convert ENUM(...) and SET(...) to TEXT
    cleaned = cleaned.replace(/\benum\s*\([^)]+\)/gi, 'TEXT');
    cleaned = cleaned.replace(/\bset\s*\([^)]+\)/gi, 'TEXT');

    // Remove AUTO_INCREMENT
    cleaned = cleaned.replace(/AUTO_INCREMENT/gi, '');

    // Normalize data types
    cleaned = cleaned.replace(/\b(?:tinyint|smallint|mediumint|int|bigint)(?:\s*\([0-9]+\))?(?:\s+unsigned)?\b/gi, 'INTEGER');
    cleaned = cleaned.replace(/\b(?:varchar|char|tinytext|mediumtext|longtext)(?:\s*\([0-9]+\))?\b/gi, 'TEXT');
    cleaned = cleaned.replace(/\b(?:datetime|timestamp|date|time)\b/gi, 'TEXT');
    cleaned = cleaned.replace(/\b(?:float|double|decimal)(?:\s*\([0-9,\s]+\))?\b/gi, 'REAL');
    cleaned = cleaned.replace(/\bjson\b/gi, 'TEXT');
    cleaned = cleaned.replace(/\bblob\b/gi, 'BLOB');

    // Clean trailing commas before closing paren
    cleaned = cleaned.replace(/,\s*\)/g, '\n)');

    return cleaned;
  }

  /**
   * Split SQL text into separate statements, respecting quotes.
   */
  function splitSqlStatements(sql) {
    const statements = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const prev = i > 0 ? sql[i - 1] : '';

      if (char === "'" && prev !== '\\' && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prev !== '\\' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      }

      if (char === ';' && !inSingleQuote && !inDoubleQuote) {
        if (current.trim()) {
          statements.push(current);
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      statements.push(current);
    }

    return statements;
  }

  /**
   * Escape a SQL identifier (table/column name) with double quotes.
   */
  function escapeIdentifier(name) {
    return `"${name.replace(/"/g, '""')}"`;
  }

  /**
   * Escape LIKE pattern special characters.
   */
  function escapeLike(str) {
    return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  /**
   * Classify whether a SQL statement is a write operation.
   * Uses token-level analysis, not just keyword search.
   */
  function isWriteOperation(sql) {
    // Remove comments and leading whitespace
    const cleaned = sql
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    // Get the first meaningful keyword
    const match = cleaned.match(/^\s*(\w+)/i);
    if (!match) return false;

    const keyword = match[1].toUpperCase();
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE',
                           'REPLACE', 'TRUNCATE', 'REINDEX', 'VACUUM', 'ATTACH',
                           'DETACH', 'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
                           'RELEASE'];
    return writeKeywords.includes(keyword);
  }

  /**
   * Classify SQL for destructive operation warning.
   * Returns { destructive: boolean, type: string }
   */
  function classifySQL(sql) {
    const cleaned = sql
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    const match = cleaned.match(/^\s*(\w+)/i);
    if (!match) return { destructive: false, type: 'unknown' };

    const keyword = match[1].toUpperCase();

    if (keyword === 'DROP') return { destructive: true, type: 'DROP' };
    if (keyword === 'DELETE') return { destructive: true, type: 'DELETE' };
    if (keyword === 'TRUNCATE') return { destructive: true, type: 'TRUNCATE' };
    if (keyword === 'ALTER') return { destructive: true, type: 'ALTER' };
    if (keyword === 'UPDATE') return { destructive: false, type: 'UPDATE', isWrite: true };
    if (keyword === 'INSERT' || keyword === 'REPLACE') return { destructive: false, type: keyword, isWrite: true };
    if (keyword === 'CREATE') return { destructive: false, type: 'CREATE', isWrite: true };

    return { destructive: false, type: keyword };
  }

  return {
    open, close, isLoaded, isModified, markModified, getInfo,
    loadSampleDatabase,
    getTables, getViews, getIndexes,
    getTableInfo, getRowCount, getTableSQL, getFullSchema,
    queryTable, executeSQL,
    insertRecord, updateRecord, deleteRecord,
    exportDatabase, resetToOriginal,
    getAllTableData, classifySQL, escapeIdentifier,
    get db() { return db; }
  };
})();

// SQL.js loader reference (set by the global initSqlJs)
let initSqlJs_loader = null;
