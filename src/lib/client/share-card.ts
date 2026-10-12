export interface ShareCardData {
  flagCount: number;
  redCount: number;
  inHand: number | null;
  ctc: number | null;
}

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const PAPER = "#f2f5f3";
const INK = "#14232b";
const SOFT = "#46585f";
const MONEY = "#0a6b50";
const RED = "#a8201a";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function cardHeadline(d: ShareCardData): string {
  if (d.flagCount === 0) return "No surprises in my letter";
  return `${d.flagCount} ${d.flagCount === 1 ? "thing" : "things"} I didn't notice`;
}

export async function drawShareCard(canvas: HTMLCanvasElement, d: ShareCardData, host: string, showAmounts: boolean): Promise<void> {
  const css = getComputedStyle(document.documentElement);
  const family = (main: string, ext: string) => [css.getPropertyValue(main).trim(), css.getPropertyValue(ext).trim(), "system-ui", "sans-serif"].filter(Boolean).join(", ");
  const display = family("--f-display", "--f-display-ext");
  const body = family("--f-body", "--f-body-ext");
  try {
    await Promise.all([document.fonts.load(`700 80px ${display}`), document.fonts.load(`400 30px ${body}`), document.fonts.load(`600 30px ${body}`)]);
  } catch {
    /* fall back to system fonts */
  }

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const left = 80;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = INK;
  ctx.font = `750 40px ${display}`;
  ctx.fillText("InHand", left, 110);

  ctx.font = `700 104px ${display}`;
  ctx.fillText("My offer, decoded.", left, 260);

  ctx.fillStyle = d.redCount > 0 ? RED : MONEY;
  ctx.font = `700 64px ${display}`;
  ctx.fillText(cardHeadline(d), left, 360);

  if (showAmounts && d.inHand != null) {
    ctx.fillStyle = INK;
    ctx.font = `600 44px ${body}`;
    const ctcPart = d.ctc ? ` on a ₹${inr.format(d.ctc)} CTC` : "";
    ctx.fillText(`About ₹${inr.format(d.inHand)} a month in hand${ctcPart}`, left, 440);
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, 510);
  ctx.lineTo(CARD_WIDTH - left, 510);
  ctx.moveTo(left, 518);
  ctx.lineTo(CARD_WIDTH - left, 518);
  ctx.stroke();

  ctx.fillStyle = SOFT;
  ctx.font = `400 32px ${body}`;
  ctx.fillText(`Decode your offer letter, free and private: ${host}`, left, 575);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
