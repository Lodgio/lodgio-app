/** Olive / cream from the Lodgio UI, as Google Sheets RGB (0–1). */
const OLIVE = { red: 99 / 255, green: 107 / 255, blue: 48 / 255 };
const CREAM = { red: 245 / 255, green: 230 / 255, blue: 199 / 255 };
const STRIPE = { red: 251 / 255, green: 246 / 255, blue: 236 / 255 };
const WHITE = { red: 1, green: 1, blue: 1 };

const COLUMN_WIDTHS = [150, 170, 180, 140, 140, 80, 80, 160, 170, 150, 160, 170, 170];

export function bookingsSheetFormatRequests(sheetId: number, columnCount: number) {
  const widths = COLUMN_WIDTHS.slice(0, columnCount).map((pixelSize, index) => ({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS" as const,
        startIndex: index,
        endIndex: index + 1,
      },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  }));

  return [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          tabColor: OLIVE,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "tabColor,gridProperties.frozenRowCount",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
        cell: {
          userEnteredFormat: {
            backgroundColor: OLIVE,
            textFormat: {
              bold: true,
              foregroundColor: CREAM,
              fontSize: 11,
            },
            horizontalAlignment: "LEFT",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS" as const, startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 36 },
        fields: "pixelSize",
      },
    },
    ...widths,
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          startColumnIndex: 8,
          endColumnIndex: 11,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: "₹#,##0" },
            horizontalAlignment: "RIGHT",
          },
        },
        fields: "userEnteredFormat(numberFormat,horizontalAlignment)",
      },
    },
    {
      addBanding: {
        bandedRange: {
          range: {
            sheetId,
            startRowIndex: 0,
            startColumnIndex: 0,
            endColumnIndex: columnCount,
          },
          rowProperties: {
            headerColor: OLIVE,
            firstBandColor: WHITE,
            secondBandColor: STRIPE,
          },
        },
      },
    },
    {
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            startColumnIndex: 0,
            endColumnIndex: columnCount,
          },
        },
      },
    },
  ];
}
