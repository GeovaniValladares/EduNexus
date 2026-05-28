import { existsSync, readFileSync } from 'node:fs';

/**
 * Validates a SQLite database file by reading its 16-byte magic header.
 * Does NOT require the sqlite3 CLI — works on any OS with pure Node.js.
 *
 * SQLite files always start with the string "SQLite format 3\000"
 * ref: https://www.sqlite.org/fileformat.html#the_database_header
 *
 * @param {string} filePath
 * @returns {boolean}
 */
export function isSqliteOk(filePath) {
  if (!filePath || !existsSync(filePath)) return false;

  try {
    // Must be at least 100 bytes (minimum valid SQLite header)
    const buf = readFileSync(filePath);
    if (buf.length < 100) return false;

    // Check the 16-byte magic string at offset 0
    const magic = buf.subarray(0, 16).toString('binary');
    if (magic !== 'SQLite format 3\x00') return false;

    // Sanity check: page size must be 512–65536 and a power of two (or 1 = 65536)
    const pageSize = buf.readUInt16BE(16);
    const validPageSize = pageSize === 1 || (pageSize >= 512 && (pageSize & (pageSize - 1)) === 0);
    return validPageSize;
  } catch {
    return false;
  }
}
