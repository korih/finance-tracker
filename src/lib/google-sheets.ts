export interface SpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export async function listSpreadsheets(
  accessToken: string
): Promise<SpreadsheetFile[]> {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "50",
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const error = (await response.json()) as { error?: { message?: string } };
    throw new Error(
      `Drive API error (${response.status}): ${error.error?.message ?? "Unknown error"}`
    );
  }

  const data = (await response.json()) as { files?: SpreadsheetFile[] };
  return data.files ?? [];
}

export interface SheetData {
  headers: string[];
  rows: string[][];
}

async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const error = (await response.json()) as { error?: { message?: string } };
    throw new Error(
      `Sheets API error (${response.status}): ${error.error?.message ?? "Unknown error"}`
    );
  }

  const data = (await response.json()) as { values?: string[][] };
  return data.values ?? [];
}

/** Fetch just the header row (row 1) to detect column positions. */
export async function getSheetHeaders(
  accessToken: string,
  spreadsheetId: string
): Promise<string[]> {
  const values = await sheetsGet(accessToken, spreadsheetId, "Sheet1!1:1");
  return values[0] ?? [];
}

/**
 * Fetch data rows that come after `afterRowIndex` (exclusive).
 * row_index is 1-based, counting data rows only (header excluded).
 *
 * Returns the raw rows and the row_index of the first returned row so the
 * caller can correctly assign row_index values when upserting.
 *
 * If `afterRowIndex` is 0, returns all data rows (full initial load).
 */
export async function getSheetRowsFrom(
  accessToken: string,
  spreadsheetId: string,
  afterRowIndex: number
): Promise<{ rows: string[][]; firstRowIndex: number }> {
  // Sheet row number of the first data row we want:
  //   sheet row 1  = header
  //   sheet row 2  = data row_index 1
  //   sheet row N  = data row_index N-1
  // So data row_index (afterRowIndex + 1) is at sheet row (afterRowIndex + 2).
  const startSheetRow = afterRowIndex + 2;
  const range = `Sheet1!A${startSheetRow}:ZZ`;

  const rows = await sheetsGet(accessToken, spreadsheetId, range);
  return { rows, firstRowIndex: afterRowIndex + 1 };
}
