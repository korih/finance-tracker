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
    const error = await response.json();
    throw new Error(
      `Drive API error (${response.status}): ${error.error?.message ?? "Unknown error"}`
    );
  }

  const data = await response.json();
  return data.files ?? [];
}

export interface SheetData {
  headers: string[];
  rows: string[][];
}

export async function getSheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetData> {
  const range = encodeURIComponent("Sheet1");

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Sheets API error (${response.status}): ${error.error?.message ?? "Unknown error"}`
    );
  }

  const data = await response.json();
  const values: string[][] = data.values ?? [];

  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: values[0],
    rows: values.slice(1),
  };
}
