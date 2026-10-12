import { itemsToText, looksScanned, type PdfTextItem } from "./pdf-lines";

export type FileErrorCode = "unsupported" | "too_big" | "scanned" | "empty" | "locked" | "failed";

export class FileError extends Error {
  constructor(
    public code: FileErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 20;

export const FILE_MESSAGES: Record<FileErrorCode, string> = {
  unsupported: "We can read PDF, Word (.docx) and plain text files. For anything else, copy the text and paste it below.",
  too_big: "That file is over 10 MB. Offer letters are usually much smaller, so check you picked the right file, or paste the text instead.",
  scanned: "This PDF looks like a scan or a photo, so there's no text for us to read. Open it, select all, copy, and paste the text here instead.",
  empty: "We couldn't find any text in that file. Try pasting the text instead.",
  locked: "This PDF is password protected. Open it, copy the text, and paste it here instead.",
  failed: "We couldn't open that file. Try pasting the text instead.",
};

async function readPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages = Math.min(doc.numPages, MAX_PAGES);
  const out: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out.push(itemsToText(content.items.filter((it): it is typeof it & PdfTextItem => "str" in it) as PdfTextItem[]));
  }
  const text = out.join("\n\n").trim();
  if (looksScanned(text, pages)) throw new FileError("scanned", FILE_MESSAGES.scanned);
  return text;
}

async function readDocx(data: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: data });
  return value.trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new FileError("too_big", FILE_MESSAGES.too_big);
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isDocx = name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isText = file.type === "text/plain" || name.endsWith(".txt");
  if (!isPdf && !isDocx && !isText) throw new FileError("unsupported", FILE_MESSAGES.unsupported);

  try {
    let text: string;
    if (isText) text = (await file.text()).trim();
    else if (isPdf) text = await readPdf(await file.arrayBuffer());
    else text = await readDocx(await file.arrayBuffer());
    if (!text) throw new FileError("empty", FILE_MESSAGES.empty);
    return text;
  } catch (err) {
    if (err instanceof FileError) throw err;
    if (err instanceof Error && err.name === "PasswordException") throw new FileError("locked", FILE_MESSAGES.locked);
    throw new FileError("failed", FILE_MESSAGES.failed);
  }
}
