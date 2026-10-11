/**
 * detector.js - Database format detection module
 *
 * Inspects file header bytes and extensions to identify database formats.
 * Extensible: add new detectors to the DETECTORS array.
 */
const FormatDetector = (() => {

  /** Known format detector functions */
  const DETECTORS = [
    {
      name: 'SQLite',
      extensions: ['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'],
      detect(bytes) {
        // SQLite files start with "SQLite format 3\000"
        if (bytes.length < 16) return false;
        const sig = String.fromCharCode(...bytes.slice(0, 16));
        return sig === 'SQLite format 3\0';
      },
      info: 'SQLite 3 database. Fully supported via SQL.js (WebAssembly).'
    },
    {
      name: 'SQL Script',
      extensions: ['.sql'],
      detect(bytes, filename) {
        if (filename && filename.toLowerCase().endsWith('.sql')) return true;
        if (bytes.length < 2) return false;
        // Check if text starts with common SQL keywords or comments
        const sample = String.fromCharCode(...bytes.slice(0, Math.min(bytes.length, 512))).trim();
        return /^(--|\/\*|CREATE|INSERT|DROP|SELECT|PRAGMA|BEGIN|USE|SET)/i.test(sample);
      },
      info: 'SQL script or database dump (.sql). Parsed and executed into in-memory SQLite database.'
    },
    {
      name: 'Microsoft Access (MDB)',
      extensions: ['.mdb'],
      detect(bytes) {
        if (bytes.length < 4) return false;
        return bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00;
      },
      info: 'Microsoft Access (Jet) database. Not supported in browser - requires a dedicated engine or conversion.'
    },
    {
      name: 'Microsoft Access (ACCDB)',
      extensions: ['.accdb'],
      detect(bytes) {
        if (bytes.length < 4) return false;
        return bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00;
      },
      info: 'Microsoft Access (ACE) database. Not supported in browser - requires a dedicated engine or conversion.'
    },
    {
      name: 'Berkeley DB',
      extensions: ['.db'],
      detect(bytes) {
        if (bytes.length < 16) return false;
        // BDB magic at byte 12: 0x00053162 (big-endian) or 0x62310500 (little-endian)
        const be = (bytes[12] << 24 | bytes[13] << 16 | bytes[14] << 8 | bytes[15]) >>> 0;
        const le = (bytes[15] << 24 | bytes[14] << 16 | bytes[13] << 8 | bytes[12]) >>> 0;
        return be === 0x00053162 || le === 0x00053162;
      },
      info: 'Berkeley DB file. Not supported in browser - requires the Berkeley DB engine.'
    },
    {
      name: 'H2 Database',
      extensions: ['.db', '.h2.db'],
      detect(bytes) {
        if (bytes.length < 48) return false;
        const header = String.fromCharCode(...bytes.slice(0, 48));
        return header.includes('-- H2') || header.includes('H2 Database');
      },
      info: 'H2 Database (Java). Not supported in browser - requires the H2 Java engine.'
    },
    {
      name: 'Encrypted / Password-Protected',
      extensions: [],
      detect(bytes) {
        return false;
      },
      info: 'The file appears encrypted or password-protected. Cannot be opened without the correct key.'
    }
  ];

  /**
   * Detect the format of a database file.
   * @param {Uint8Array} bytes  First N bytes of the file (at least 128 recommended)
   * @param {string} filename   Original filename
   * @returns {{ name: string, supported: boolean, info: string, isSqlScript?: boolean }}
   */
  function detect(bytes, filename) {
    const ext = getExtension(filename);

    if (ext === '.sql') {
      return {
        name: 'SQL Script',
        supported: true,
        info: 'SQL script or dump file (.sql). Executed into in-memory SQLite database.',
        extension: ext,
        isSqlScript: true
      };
    }

    for (const d of DETECTORS) {
      if (d.detect(bytes, filename)) {
        const isSupported = d.name === 'SQLite' || d.name === 'SQL Script';
        return {
          name: d.name,
          supported: isSupported,
          info: d.info,
          extension: ext,
          isSqlScript: d.name === 'SQL Script'
        };
      }
    }

    // Fallback: check extension
    const sqliteExts = ['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'];
    if (sqliteExts.includes(ext)) {
      return {
        name: 'Unknown',
        supported: false,
        info: `The file has a "${ext}" extension but its header does not match any known database format. It may be corrupted, encrypted, or belong to an application-specific format.`,
        extension: ext
      };
    }

    return {
      name: 'Unknown',
      supported: false,
      info: 'Unknown file format. The file does not match any supported database format.',
      extension: ext
    };
  }

  /**
   * Validate that a file is a valid SQLite database by checking the header more thoroughly.
   */
  function validateSQLiteHeader(bytes) {
    if (bytes.length < 100) return { valid: false, reason: 'File too small to be a valid SQLite database.' };

    const sig = String.fromCharCode(...bytes.slice(0, 16));
    if (sig !== 'SQLite format 3\0') {
      return { valid: false, reason: 'Missing SQLite file signature.' };
    }

    // Page size is at bytes 16-17 (big-endian), must be power of 2 between 512 and 65536
    const pageSize = (bytes[16] << 8) | bytes[17];
    // Page size 1 means 65536 in modern SQLite
    const actualPageSize = pageSize === 1 ? 65536 : pageSize;
    if (actualPageSize < 512 || actualPageSize > 65536 || (actualPageSize & (actualPageSize - 1)) !== 0) {
      return { valid: false, reason: `Invalid page size: ${actualPageSize}` };
    }

    return { valid: true, pageSize: actualPageSize };
  }

  function getExtension(filename) {
    if (!filename) return '';
    const dot = filename.lastIndexOf('.');
    return dot >= 0 ? filename.substring(dot).toLowerCase() : '';
  }

  /**
   * Get list of accepted file extensions for the file picker.
   */
  function getAcceptedExtensions() {
    return '.db,.sqlite,.sqlite3,.db3,.s3db,.sl3,.sql,.mdb,.accdb';
  }

  return { detect, validateSQLiteHeader, getAcceptedExtensions };
})();
