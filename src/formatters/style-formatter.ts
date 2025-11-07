import ExcelJS from 'exceljs';

export class StyleFormatter {
  applyStyle(cell: ExcelJS.Cell, style: any) {
    if (style.font) {
      cell.font = style.font;
    }

    if (style.alignment) {
      cell.alignment = style.alignment;
    }

    if (style.fill) {
      cell.fill = style.fill;
    }

    if (style.border) {
      cell.border = style.border;
    }
  }

  createBorder(style: string = 'thin', color: string = 'FF000000') {
    const borderStyle = { style, color: { argb: color } };
    return {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle,
    };
  }
}
