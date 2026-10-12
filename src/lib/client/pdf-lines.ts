export interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

const SAME_LINE_TOLERANCE = 2;
const CELL_GAP = 12;

export function itemsToText(items: PdfTextItem[]): string {
  const lines: string[] = [];
  let line = "";
  let lastY: number | null = null;
  let lastEnd = 0;
  let pendingBreak = false;

  for (const it of items) {
    if (!it.str) {
      if (it.hasEOL) pendingBreak = true;
      continue;
    }
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    const newLine = lastY !== null && (Math.abs(y - lastY) > SAME_LINE_TOLERANCE || pendingBreak);
    if (newLine) {
      lines.push(line.trimEnd());
      line = "";
    }
    if (line) {
      const gap = x - lastEnd;
      if (gap > CELL_GAP) line += " | ";
      else if (!line.endsWith(" ") && !it.str.startsWith(" ")) line += " ";
    }
    line += it.str;
    lastY = y;
    lastEnd = x + it.width;
    pendingBreak = Boolean(it.hasEOL);
  }
  if (line) lines.push(line.trimEnd());
  return lines.join("\n");
}

export function looksScanned(text: string, pages: number): boolean {
  const chars = text.replace(/\s+/g, "").length;
  return chars < Math.max(60, pages * 25);
}
