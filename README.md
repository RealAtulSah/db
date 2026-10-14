# DB File Explorer

A modern, fast, and completely client-side database exploration and management tool running directly in your web browser. Built on SQLite WebAssembly (SQL.js), DB File Explorer empowers developers, data analysts, database administrators, and students to inspect schemas, execute SQL queries, filter and edit records, and export datasets without installing native desktop software, running database engines, or setting up backend servers.

100% private and offline-first: your databases and SQL scripts are processed exclusively within your browser's local memory. Zero bytes of your data are ever transmitted to any external server.

---

## Key Features

### 1. In-Browser SQLite WebAssembly Engine
- Powered by official SQLite compiled to WebAssembly (SQL.js).
- Full SQLite 3 SQL query execution directly in memory.
- Instant loading with binary ArrayBuffer ingestion for local files.
- Capable of handling multi-megabyte databases and tables with tens of thousands of rows smoothly.

### 2. Comprehensive File Support & Detection
- **Native SQLite Databases**: Full read and write support for `.db`, `.sqlite`, `.sqlite3`, `.db3`, `.s3db`, and `.sl3` files, validated via 16-byte magic header checks (`SQLite format 3\0`).
- **SQL Scripts & Dumps**: Direct ingestion and in-memory execution of `.sql` database dumps.
  - Automated SQL dialect cleanup for MySQL, MariaDB, and phpMyAdmin exports.
  - Translates MySQL-specific `ENGINE=InnoDB`, `DEFAULT CHARSET`, and `COLLATE` clauses.
  - Resolves MySQL `ENUM(...)` and `SET(...)` datatypes to compatible SQLite `TEXT` definitions.
  - Strips MariaDB `CHECK (json_valid(...))` and inline character sets.
  - Converts MySQL `ALTER TABLE ... ADD (UNIQUE) KEY` statements into SQLite `CREATE (UNIQUE) INDEX IF NOT EXISTS`.
  - Normalizes MySQL escaped quotes (`\'` to `''`) and date functions (`DEFAULT current_timestamp()`).
- **File Format Inspection**: Inspects uploaded files and alerts users if non-SQLite proprietary formats are supplied (such as Microsoft Access `.mdb` / `.accdb`, Berkeley DB, H2 Database, or password-encrypted stores), offering clear guidance.
- **Built-in Sample Database**: One-click interactive demo database featuring a realistic e-commerce schema (5 normalized tables: `categories`, `customers`, `products`, `orders`, `order_items`; 1 analytical view: `v_customer_order_summary`; and 4 indexes) for immediate testing.

### 3. Database Schema & Structure Inspector
- **Database Overview**: Shows database file size, page size, encoding, total tables, views, triggers, and indexes.
- **Table Schema Details**: View column names, affinities / types, primary key flags, NOT NULL constraints, default values, and foreign key relationships.
- **Views & Indexes**: Inspect view SQL definitions, index target tables, column mappings, and uniqueness constraints.
- **Live Row Count Metrics**: Fast table row counts rendered directly in the sidebar navigation.

### 4. Interactive Data Grid Viewer
- **Paginated Record Browsing**: Seamlessly browse large datasets with configurable page sizing (10, 25, 50, 100 records per page).
- **Column Sorting**: Single-click header sorting with toggleable ascending and descending orders.
- **Column Visibility Selector**: Show or hide individual table columns to focus on relevant fields.
- **BLOB and NULL Handling**: Distinct, intuitive visual indicators for SQL `NULL` values and binary `BLOB` objects.

### 5. Multi-Column Filter & Search System
- **Text Column Operators**:
  - Contains (case-insensitive substring match)
  - Exact match
  - Starts with
  - Is NULL
  - Is NOT NULL
- **Numeric Column Operators**:
  - Equals (`=`)
  - Greater than (`>`)
  - Less than (`<`)
  - Between (inclusive numerical range)
  - Is NULL
  - Is NOT NULL
- **Compound Multi-Rule Filtering**: Combine multiple column conditions simultaneously with instant grid updates.

### 6. Interactive SQL Console & Query Editor
- **Monospace Code Input**: Clean, distraction-free SQL workspace with automatic indentation (`Tab` key indents 2 spaces).
- **Instant Execution**: Run queries with `Ctrl + Enter` (or `Cmd + Enter`) or by clicking the Run button.
- **Execution Performance Telemetry**: Microsecond-accurate query runtime counter and affected row stats.
- **Predefined Query Snippets**: Quick-access templates for common tasks:
  - Select all records (`SELECT * FROM table LIMIT 100`)
  - Count rows (`SELECT count(*) FROM table`)
  - Group and aggregate (`SELECT col, count(*) FROM table GROUP BY col`)
  - Join tables (`SELECT * FROM a JOIN b ON a.id = b.a_id`)
  - Inspect SQLite master schema (`SELECT type, name, sql FROM sqlite_master`)
- **Query History**: Automatically stores recent queries during your session. Click any previous query in the history panel to reload and re-execute.
- **Dedicated Results Grid**: Dedicated export tools directly on query output grids.

### 7. Record CRUD Editor
- **Insert Records**: Dedicated modal form automatically tailored to the target table's schema, with data type guidance and primary key detection.
- **Edit Existing Records**: Click the edit button on any row in the table view to open a pre-filled editor modal, updating records securely using primary keys or unique row identification.
- **Delete Records**: Safe row deletion workflow with explicit confirmation dialogues.
- **Safe NULL Value Management**: Toggle checkboxes to assign true SQL `NULL` values rather than empty strings.
- **Unsaved Changes Tracker**: Real-time status indicator alerting you to unsaved modifications, coupled with browser beforeunload warnings to prevent accidental data loss.
- **Reset to Original State**: One-click rollback restores the database to the exact byte state it had upon initial upload.

### 8. Comprehensive Export Suite
- **CSV Export**: RFC 4180 compliant CSV generator with UTF-8 Byte Order Mark (BOM) for compatibility with Microsoft Excel, Apple Numbers, and Google Sheets.
- **JSON Export**: Formatted JSON array representing table rows or query outputs, with binary BLOBs safely serialized to Base64 objects.
- **Excel (.xlsx) Export**: High-fidelity workbooks powered by SheetJS:
  - Formatted and styled table headers.
  - Alternating row striping for enhanced readability.
  - Automatic column width calculation based on data content.
  - Frozen header row and active AutoFilter toggles enabled.
  - Formula injection defense: automatically escapes dangerous leading characters (`=`, `+`, `-`, `@`) in string cells.
- **Multi-Table Excel Workbook**: Single-click export of an entire database into a multi-tab Excel spreadsheet, complete with an optional Summary worksheet listing all tables and row counts.
- **SQLite Binary (.db) Download**: Export and download your modified SQLite database as a standalone `.db` file ready to use in any backend application, mobile app, or SQLite tool.

### 9. Design System & Accessibility
- Custom Vanilla CSS3 design system built with CSS variables.
- Responsive layout with collapsible sidebar, toolbar, status bar, and modal overlay systems.
- Curated typography: Inter for user interface text and JetBrains Mono for SQL code, schema definitions, and table values.
- Clean SVG iconography adhering to strict UI rules without representative emoji icons.

---

## Supported File Formats

| Format | File Extensions | Header Signature | Support Level |
|---|---|---|---|
| SQLite 3 Database | `.db`, `.sqlite`, `.sqlite3`, `.db3`, `.s3db`, `.sl3` | `SQLite format 3\0` (16 bytes) | Full read, write, query, edit, and export |
| SQL Script / Dump | `.sql` | Text (starts with SQL statements or comments) | Parsed into in-memory SQLite database |
| Sample Database | Built-in | Pre-generated SQLite in-memory instance | Full read, write, query, edit, and export |
| Microsoft Access | `.mdb`, `.accdb` | `0x00 0x01 0x00 0x00` (Jet/ACE) | Detection with conversion instructions |
| Berkeley DB | `.db` | Magic bytes `0x00053162` or `0x62310500` | Detection with conversion instructions |
| H2 Database | `.db`, `.h2.db` | Contains `-- H2` or `H2 Database` | Detection with conversion instructions |

---

## Architecture & Directory Structure

DB File Explorer is built as a pure, zero-build static web application. It does not require a compilation step, node modules, or external CDN dependencies at runtime.

```
db/
├── index.html              # HTML5 application shell and script loader
├── css/
│   └── style.css           # Vanilla CSS3 design system, themes, and layouts
├── js/
│   ├── app.js              # Application coordinator, navigation, and modal manager
│   ├── database.js         # SQLite WASM wrapper, SQL script parser, and engine
│   ├── detector.js         # Magic byte analyzer and format detector
│   ├── export-manager.js   # Exporters for CSV, JSON, Excel (.xlsx), and .db files
│   ├── notifications.js    # Non-blocking toast notification system
│   ├── query-editor.js     # SQL query editor, history, and snippet runner
│   ├── record-editor.js    # CRUD modal forms, data validation, and row editor
│   ├── search-filter.js    # Column filter builder and multi-condition matcher
│   └── table-view.js       # Paginated tabular record viewer and column controls
├── lib/
│   ├── sql-wasm.js         # SQL.js JavaScript interface
│   ├── sql-wasm.wasm       # Compiled SQLite WebAssembly binary (~655 KB)
│   └── xlsx.full.min.js    # SheetJS standalone library for Excel workbooks
├── workers/                # Reserved for background worker threads
└── README.md               # Project documentation
```

### Module Responsibilities

- **`index.html`**: Defines the structural container (`#app`), loads local fonts and styles, vendors libraries from `lib/`, and initializes the application bootstrap script.
- **`js/database.js`**: Core data abstraction layer. Manages SQL.js lifecycle, executes queries, manages transactions, parses and normalizes MySQL/MariaDB SQL script dumps into SQLite syntax, tracks mutation state, and preserves the original file bytes for rollback.
- **`js/detector.js`**: Reads initial file byte arrays to inspect magic byte signatures. Differentiates SQLite 3 from unsupported engines (Access, Berkeley DB, H2) or `.sql` text files.
- **`js/table-view.js`**: Renders dynamic HTML tables with column headers, sorting indicators, pagination navigation, quick search, and row action triggers.
- **`js/search-filter.js`**: Generates column-aware filter panels supporting both text and numeric predicates.
- **`js/query-editor.js`**: Handles the custom SQL input box, executes queries asynchronously, displays tabular query output grids, records session query history, and provides one-click starter snippets.
- **`js/record-editor.js`**: Dynamically builds modal forms for INSERT and UPDATE operations based on table `PRAGMA table_info` schema inspection, ensuring type safety and NULL handling.
- **`js/export-manager.js`**: Generates RFC 4180 compliant CSVs, JSON arrays, styled Excel spreadsheets using SheetJS, and modified SQLite binary files via `db.export()`.
- **`js/notifications.js`**: Displays transient success, info, warning, and error toast alerts with auto-dismiss timers.
- **`js/app.js`**: Acts as the central mediator. Handles drag-and-drop file ingestion, file inputs, sidebar routing, modal dialog lifecycle, unsaved modification tracking, and window unload warnings.

---

## Getting Started

Because DB File Explorer utilizes WebAssembly (`sql-wasm.wasm`), modern browsers require the application to be served via an HTTP or HTTPS protocol (browsers block WebAssembly instantiation over direct `file:///` URLs due to CORS security policies).

### Prerequisites
A modern web browser with WebAssembly support:
- Google Chrome / Chromium 57+
- Mozilla Firefox 52+
- Apple Safari 11+
- Microsoft Edge 79+

### Running Locally

You can serve the directory using any static web server. Choose any of the following methods:

#### Method 1: Using Node.js `serve` or `http-server`
```bash
# Using npx serve (recommended)
npx serve .

# Or using npx http-server
npx http-server . -p 3000
```

#### Method 2: Using Python
```bash
# Python 3
python -m http.server 3000
```

#### Method 3: Using PHP
```bash
php -S localhost:3000
```

#### Method 4: Using VS Code Live Server
1. Open the project folder in VS Code.
2. Click **Go Live** on the status bar (via the Live Server extension).
3. The application will open automatically in your browser at `http://127.0.0.1:5500` or `http://localhost:3000`.

Once the server is running, navigate to `http://localhost:3000` in your browser.

---

## Usage Guide

### 1. Opening a Database
- **Drag and Drop**: Drag any `.db`, `.sqlite`, `.sqlite3`, `.db3`, or `.sql` file directly from your file manager onto the application window.
- **File Browser**: Click the **Choose Database File** button on the welcome screen to select a file from your computer.
- **Try the Sample**: Click **Load Sample Database** on the welcome screen to instantly load a multi-table e-commerce database with realistic relationships, views, and indexes.

### 2. Exploring Schema & Records
- Use the left sidebar to toggle between **Overview**, **Tables**, and **SQL Query**.
- In the **Tables** view, select any table from the sidebar list to view its records.
- Click any column header to sort rows ascending or descending.
- Use the **Columns** dropdown above the table to show or hide specific columns.
- Adjust the pagination selector (bottom right) to display 10, 25, 50, or 100 records per page.

### 3. Filtering Records
1. Click the **Filter** button in the table toolbar.
2. Select a target column.
3. Choose a filter operator (e.g. `Contains`, `Starts with`, `Greater than`, `Between`, `Is NULL`).
4. Enter the comparison value (or range values) and click **Apply Filter**.
5. Add additional conditions as needed. Remove individual filters with the remove button or clear all filters with **Clear Filters**.

### 4. Editing and Modifying Data
- **Insert a Record**: Click **New Record** in the table toolbar. Enter field values in the modal dialogue. For auto-incrementing primary keys or NULL fields, leave the field empty or check the **Set NULL** checkbox. Click **Insert Record**.
- **Edit a Record**: Click the **Edit** icon button on the right side of any row in the table grid. Modify values in the modal and click **Save Changes**.
- **Delete a Record**: Click the **Delete** icon button on any row. Confirm the action in the safety prompt to remove the row.
- **Unsaved Changes Notice**: When any modification is made, the top status bar displays an `Unsaved Changes` indicator.

### 5. Running Custom SQL Queries
1. Navigate to the **SQL Query** section from the sidebar.
2. Type your SQL statement in the editor box or click any of the predefined snippet buttons (`SELECT *`, `COUNT(*)`, `GROUP BY`, `JOIN`, `Schema`).
3. Press `Ctrl + Enter` (or `Cmd + Enter` on macOS), or click the **Run Query** button.
4. The result table appears below with execution time and row count metrics.
5. Click any query in the **Query History** panel on the right to re-populate the editor.
6. Export the result set directly using the **Export Results** button above the output grid.

### 6. Exporting Data
- **Export Single Table**: Open any table, click the **Export** button in the toolbar, and choose **CSV**, **JSON**, or **Excel (.xlsx)**.
- **Export All Tables to Excel**: Click the **Export All to Excel** button in the top navigation bar to generate a multi-sheet workbook containing all tables and an optional summary sheet.
- **Download Modified Database**: Click the **Download DB** button in the top navigation bar to download the updated SQLite `.db` binary file containing all your inserts, updates, and deletes.
- **Reset Database**: Click the **Reset** button in the top navigation bar to discard all edits and revert the database back to its original state.

---

## Keyboard Shortcuts

| Shortcut | Context | Action |
|---|---|---|
| `Ctrl + Enter` / `Cmd + Enter` | SQL Query Editor | Execute current SQL query |
| `Tab` | SQL Query Editor | Insert 2-space indentation |
| `Escape` | Modal Windows | Close open modal dialogue or overlay |
| `Enter` / `Space` | Welcome Dropzone | Open native file chooser dialogue |

---

## Security & Privacy

DB File Explorer is engineered with strict client-side data isolation:
- **No Cloud Uploads**: Files uploaded to the application are loaded strictly into browser WebAssembly memory via standard JavaScript `FileReader` and `Uint8Array` APIs. No data packets or file chunks are ever sent across the network.
- **Offline Functionality**: Once loaded, the application operates completely offline without an active internet connection.
- **Zero Telemetry or Analytics**: There are no third-party tracking scripts, cookies, or external analytics libraries embedded.
- **Spreadsheet Formula Injection Defense**: When exporting data to CSV or Excel, any text cells starting with formula control characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with a leading apostrophe to protect against formula injection vulnerabilities in spreadsheet applications.

---

## Author & Attribution

Developed by **Atul Sah**  
Website: [https://atulsah.in](https://atulsah.in)

---

## Third-Party Libraries & Licenses

DB File Explorer bundles open-source libraries locally in the `lib/` directory:
- **SQL.js**: Port of SQLite to WebAssembly by the SQL.js team. Licensed under the MIT License. SQLite itself is in the public domain.
- **SheetJS (xlsx)**: Spreadsheet parser and generator by SheetJS LLC. Licensed under the Apache 2.0 License.
- **Inter & JetBrains Mono Fonts**: Designed by Rasmus Andersson and JetBrains. Licensed under the SIL Open Font License (OFL).
