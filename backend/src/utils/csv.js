// Minimal, dependency-free CSV writer (RFC 4180): quotes any field
// containing a comma, double quote, or newline, doubling embedded quotes.
// Column order follows the keys of the first row.
function toCsv(rows) {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvField(row[header])).join(','));
  }

  return lines.join('\n');
}

function escapeCsvField(value) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

module.exports = { toCsv };
