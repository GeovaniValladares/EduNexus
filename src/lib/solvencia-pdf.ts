/**
 * Constancia de inscripción y solvencia académica — ULS
 *
 * Design matches the provided reference (modelo de carta.png):
 *   • White background header with embedded ULS logo + navy title
 *   • Navy decorative corner triangles (drawSvgPath — verified pdf-lib 1.17 API)
 *   • Info row: 4 cells (document icon + FOLIO · FECHA · PERIODO)
 *   • Student section with person-icon badge
 *   • Navy numbered section badges (I. / II.) with gold underline rule
 *   • Subject cards with book icon + numbered circle
 *   • Italic gold-centered footer + gold dot grid
 *
 * Only verified pdf-lib 1.17 draw primitives are used:
 *   drawText · drawLine · drawRectangle · drawCircle · drawEllipse · drawSvgPath · drawImage
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type MateriaInscritaPdf = {
  codigo: string;
  nombre: string;
  semestre: string;
  creditos: number;
  profesor: string;
  horario: string;
  aula: string;
};

export type ConstanciaPdfData = {
  folio: string;
  nombre: string;
  email: string;
  carrera: string;
  periodo: string;
  materias: MateriaInscritaPdf[];
  emitidoEl: string;
};

// ── Page geometry ─────────────────────────────────────────────────────────────
const PW = 595;
const PH = 842;
const ML = 52;
const MR = 52;
const CW = PW - ML - MR;   // 491 pt usable width

// ── Palette (matches reference) ───────────────────────────────────────────────
const C = {
  navy:   rgb(0.08, 0.157, 0.353),   // #142459
  navyDk: rgb(0.04, 0.09,  0.22),    // darker for triangles
  gold:   rgb(0.78, 0.62,  0.05),    // #C79D0D
  text:   rgb(0.10, 0.12,  0.16),
  sub:    rgb(0.40, 0.43,  0.50),
  boxBg:  rgb(0.95, 0.96,  0.98),
  boxBdr: rgb(0.78, 0.82,  0.90),
  cardBg: rgb(0.975,0.975, 0.99),
  white:  rgb(1,    1,     1),
  page:   rgb(0.50, 0.53,  0.60),
};

// ── Layout helper ─────────────────────────────────────────────────────────────
class CL {
  private doc:   PDFDocument;
  private pages: PDFPage[];
  private cur =  0;
  y = 0;
  private f:  PDFFont;
  private fb: PDFFont;
  private fi: PDFFont;

  constructor(doc: PDFDocument, page: PDFPage, f: PDFFont, fb: PDFFont, fi: PDFFont) {
    this.doc   = doc;
    this.pages = [page];
    this.f = f; this.fb = fb; this.fi = fi;
  }

  private get pg(): PDFPage { return this.pages[this.cur]!; }

  private need(h: number) {
    if (this.y - h < 70) {
      const p = this.doc.addPage([PW, PH]);
      this.pages.push(p);
      this.cur++;
      this.y = PH - 60;
    }
  }

  private font(b = false, i = false): PDFFont { return b ? this.fb : i ? this.fi : this.f; }
  private tw(t: string, size: number, b = false, i = false) { return this.font(b,i).widthOfTextAtSize(t, size); }

  private put(t: string, x: number, y: number, size: number, color: RGB, b = false, i = false, mw?: number) {
    this.pg.drawText(t, { x, y, size, font: this.font(b, i), color, maxWidth: mw });
  }

  private wrap(text: string, size: number, maxW: number, b = false): string[] {
    const words = text.replace(/\n/g,' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines: string[] = [];
    let cur = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const t = cur + ' ' + words[i]!;
      if (this.font(b).widthOfTextAtSize(t, size) <= maxW) cur = t;
      else { lines.push(cur); cur = words[i]!; }
    }
    lines.push(cur);
    return lines;
  }

  private justify(line: string, y: number, size: number, color: RGB, indent = 0) {
    const w = line.split(' ').filter(Boolean);
    if (w.length <= 1) { this.put(line, ML + indent, y, size, color); return; }
    const tw = w.reduce((s, x) => s + this.f.widthOfTextAtSize(x, size), 0);
    const gap = (CW - indent - tw) / (w.length - 1);
    let x = ML + indent;
    for (const word of w) {
      this.pg.drawText(word, { x, y, size, font: this.f, color });
      x += this.f.widthOfTextAtSize(word, size) + gap;
    }
  }

  // ── Public primitives ─────────────────────────────────────────────────────

  gap(n: number) { this.y -= n; }

  para(text: string, size = 10.5, color = C.text, afterGap = 10, indent = 0) {
    const lh = size * 1.58;
    const lines = this.wrap(text, size, CW - indent);
    for (let i = 0; i < lines.length; i++) {
      this.need(lh);
      const last = i === lines.length - 1;
      if (!last && lines[i]!.includes(' ')) this.justify(lines[i]!, this.y, size, color, indent);
      else this.put(lines[i]!, ML + indent, this.y, size, color);
      this.y -= lh;
    }
    this.y -= afterGap;
  }

  labelRow(label: string, value: string) {
    this.need(22);
    this.put(label, ML + 20, this.y, 9, C.sub);
    this.put(value, ML + 165, this.y, 10.5, C.text, true, false, PW - MR - ML - 165);
    this.y -= 22;
  }

  // ── Decorative corner triangles (drawSvgPath with Y going DOWN) ───────────

  /**
   * In pdf-lib 1.17, drawSvgPath:
   *   • options.x / options.y = bottom-left of path bounding box in PDF coords (Y-up)
   *   • SVG path Y values increase DOWNWARD from that origin
   *
   * Top-right corner: x = PW-60, y = PH  →  SVG path M 0,0 L 60,0 L 60,60 Z
   * Bottom-left corner: x = 0, y = 55    →  SVG path M 0,0 L 0,55 L 55,55 Z
   */
  triangles() {
    for (const pg of this.pages) {
      // Top-right
      pg.drawSvgPath('M 0,0 L 60,0 L 60,60 Z', {
        x: PW - 60, y: PH,
        color: C.navyDk,
      });
      // Bottom-left
      pg.drawSvgPath('M 0,0 L 0,55 L 55,55 Z', {
        x: 0, y: 55,
        color: C.navyDk,
      });
    }
  }

  // ── Compound components ───────────────────────────────────────────────────

  /**
   * White header: logo (if available) + vertical divider + university name + subtitle
   * + thin navy underline at bottom
   */
  async header(doc: PDFDocument) {
    const hH = 96;
    const hY = PH - hH;

    // White background (explicit, ensures clean background)
    this.pg.drawRectangle({ x: 0, y: hY, width: PW, height: hH, color: C.white });

    // ── Try embedding the ULS logo ──────────────────────────────────────
    const logoPath = join(process.cwd(), 'public', 'images', 'logos', 'logo-uls-light-bg.png');
    let logoDrawn = false;
    try {
      const logoBytes = readFileSync(logoPath);
      const logoImg   = await doc.embedPng(logoBytes);
      const logoW = 110;
      const logoH = logoImg.height * (logoW / logoImg.width);
      const logoX = ML;
      const logoY = hY + (hH - logoH) / 2;
      this.pg.drawImage(logoImg, { x: logoX, y: logoY, width: logoW, height: logoH });
      logoDrawn = true;

      // Vertical divider after logo
      const divX = logoX + logoW + 14;
      this.pg.drawLine({
        start: { x: divX, y: hY + 18 },
        end:   { x: divX, y: hY + hH - 18 },
        thickness: 1, color: rgb(0.75, 0.78, 0.85),
      });

      // University name + subtitle to the right of divider
      const textX = divX + 16;
      this.put('UNIVERSIDAD LUTERANA SALVADOREÑA', textX, hY + 60, 14, C.navy, true);
      this.put('Constancia de inscripción y solvencia académica', textX, hY + 38, 9.5, C.sub);
    } catch {
      // Fallback: "ULS" text block if logo file is not available
      this.pg.drawRectangle({ x: ML, y: hY + 20, width: 50, height: 52, color: C.navy });
      this.put('ULS', ML + 7, hY + 39, 18, C.white, true);
      this.pg.drawLine({ start: { x: ML + 60, y: hY + 18 }, end: { x: ML + 60, y: hY + hH - 18 }, thickness: 1, color: C.boxBdr });
      this.put('UNIVERSIDAD LUTERANA SALVADOREÑA', ML + 74, hY + 60, 14, C.navy, true);
      this.put('Constancia de inscripción y solvencia académica', ML + 74, hY + 38, 9.5, C.sub);
    }

    // Bottom rule of header
    this.pg.drawLine({ start: { x: 0, y: hY }, end: { x: PW, y: hY }, thickness: 1, color: C.boxBdr });

    this.y = hY - 28;
  }

  /**
   * Info row: rounded-feel box with 4 cells
   *   [DOC ICON] | FOLIO | FECHA DE EMISIÓN | PERIODO ACADÉMICO
   */
  infoRow(folio: string, fecha: string, periodo: string) {
    const boxH = 62;
    this.need(boxH + 14);
    const boxY = this.y - boxH;

    // Outer box
    this.pg.drawRectangle({ x: ML, y: boxY, width: CW, height: boxH, color: C.boxBg, borderColor: C.boxBdr, borderWidth: 0.75 });

    // ── Icon cell (first 62 pt wide) ──────────────────────────────────
    const iconCellW = 62;
    // Navy circle
    this.pg.drawCircle({ x: ML + iconCellW / 2, y: boxY + boxH / 2, size: 22, color: C.navy });
    // Simple document icon drawn with rectangles + lines
    const ic = { x: ML + iconCellW / 2 - 8, y: boxY + boxH / 2 - 11, w: 16, h: 20 };
    this.pg.drawRectangle({ x: ic.x, y: ic.y, width: ic.w, height: ic.h, color: C.white });
    // Lines to simulate text on document
    for (let l = 0; l < 3; l++) {
      this.pg.drawLine({ start: { x: ic.x + 3, y: ic.y + 5 + l * 4 }, end: { x: ic.x + ic.w - 3, y: ic.y + 5 + l * 4 }, thickness: 1, color: rgb(0.60, 0.68, 0.82) });
    }
    // Small circle badge (ribbon/medal simulation)
    this.pg.drawCircle({ x: ML + iconCellW / 2, y: boxY + boxH / 2 - 13, size: 5, color: C.gold });

    // Divider after icon
    this.pg.drawLine({ start: { x: ML + iconCellW, y: boxY + 8 }, end: { x: ML + iconCellW, y: boxY + boxH - 8 }, thickness: 0.5, color: C.boxBdr });

    // ── 3 data columns ──────────────────────────────────────────────
    const dataW = CW - iconCellW;
    const colW  = dataW / 3;
    const fields = [
      { label: 'FOLIO',             value: folio   },
      { label: 'FECHA DE EMISIÓN',  value: fecha   },
      { label: 'PERIODO ACADÉMICO', value: periodo },
    ];

    for (let i = 0; i < fields.length; i++) {
      const fx = ML + iconCellW + colW * i + 14;
      this.put(fields[i]!.label, fx, boxY + boxH - 16, 7.5, C.sub);
      this.put(fields[i]!.value, fx, boxY + 13, 11,    C.navy, true);
      if (i < 2) {
        this.pg.drawLine({ start: { x: ML + iconCellW + colW * (i + 1), y: boxY + 10 }, end: { x: ML + iconCellW + colW * (i + 1), y: boxY + boxH - 10 }, thickness: 0.5, color: C.boxBdr });
      }
    }

    this.y = boxY - 24;
  }

  /**
   * Student data section header: navy circle with person silhouette + title + gold rule
   */
  studentHeader() {
    this.need(30);

    const cx = ML + 14;
    const cy = this.y - 2;

    // Navy filled circle
    this.pg.drawCircle({ x: cx, y: cy, size: 14, color: C.navy });

    // Person silhouette (head circle + body ellipse in white)
    this.pg.drawCircle({ x: cx, y: cy + 5, size: 4, color: C.white });
    this.pg.drawEllipse({ x: cx, y: cy - 4, xScale: 7, yScale: 4.5, color: C.white });

    // Title
    const tx = ML + 36;
    this.put('DATOS DEL ESTUDIANTE', tx, this.y, 11.5, C.navy, true);

    // Gold rule from title edge to right margin
    const ruleY = this.y - 10;
    this.pg.drawLine({ start: { x: tx, y: ruleY }, end: { x: PW - MR, y: ruleY }, thickness: 1.5, color: C.gold });

    this.y -= 26;
  }

  /**
   * Numbered section block (matches reference: navy square badge + title + gold rule)
   * e.g. [I.] CONSTANCIA DE INSCRIPCIÓN DE MATERIAS ─────────────────────── (gold)
   */
  sectionBadge(roman: string, title: string) {
    this.need(52);
    this.y -= 10;

    const bW = 34;
    const bH = 34;
    const bx = ML;
    const by = this.y - bH + 8;

    // Navy square badge
    this.pg.drawRectangle({ x: bx, y: by, width: bW, height: bH, color: C.navy });
    // Roman numeral centred in badge
    const rw = this.tw(roman, 13, true);
    this.put(roman, bx + (bW - rw) / 2, by + 10, 13, C.white, true);

    // Section title
    const tx = bx + bW + 14;
    this.put(title.toUpperCase(), tx, this.y, 12, C.navy, true);

    // Gold horizontal rule from after title to right margin
    const titleW = this.tw(title.toUpperCase(), 12, true);
    const ruleX  = tx + titleW + 10;
    if (ruleX < PW - MR - 10) {
      this.pg.drawLine({ start: { x: ruleX, y: this.y + 4 }, end: { x: PW - MR, y: this.y + 4 }, thickness: 2, color: C.gold });
    }

    this.y = by - 18;
  }

  /**
   * Subject card: matches reference design
   *   [📚 icon] | #. CODE — NAME
   *              Semestre · créditos
   *              Profesor/a: …
   *              Horario: … · Aula: …
   */
  materiaCard(idx: number, m: MateriaInscritaPdf) {
    const cardH = 86;
    this.need(cardH + 14);
    const cardY = this.y - cardH;

    // Card background
    this.pg.drawRectangle({ x: ML, y: cardY, width: CW, height: cardH, color: C.cardBg, borderColor: C.boxBdr, borderWidth: 0.65 });

    // ── Book icon cell (52pt wide) ──────────────────────────────────
    const iconW = 52;
    const iconCX = ML + iconW / 2;
    const iconCY = cardY + cardH / 2;

    // Light blue circle background for icon
    this.pg.drawCircle({ x: iconCX, y: iconCY, size: 18, color: rgb(0.88, 0.91, 0.96) });

    // Book icon (two rectangles side by side to form an open book)
    const bk = { cx: iconCX, cy: iconCY };
    this.pg.drawRectangle({ x: bk.cx - 11, y: bk.cy - 8, width: 10, height: 16, color: C.navy });
    this.pg.drawRectangle({ x: bk.cx + 1,  y: bk.cy - 8, width: 10, height: 16, color: C.navy });
    // Spine line
    this.pg.drawLine({ start: { x: bk.cx, y: bk.cy - 8 }, end: { x: bk.cx, y: bk.cy + 8 }, thickness: 1.5, color: rgb(0.88, 0.91, 0.96) });
    // Lines on pages
    for (let l = 0; l < 3; l++) {
      this.pg.drawLine({ start: { x: bk.cx - 9, y: bk.cy - 4 + l * 4 }, end: { x: bk.cx - 3, y: bk.cy - 4 + l * 4 }, thickness: 0.8, color: rgb(0.75, 0.80, 0.92) });
      this.pg.drawLine({ start: { x: bk.cx + 3,  y: bk.cy - 4 + l * 4 }, end: { x: bk.cx + 9,  y: bk.cy - 4 + l * 4 }, thickness: 0.8, color: rgb(0.75, 0.80, 0.92) });
    }

    // Divider after icon cell
    this.pg.drawLine({ start: { x: ML + iconW, y: cardY + 10 }, end: { x: ML + iconW, y: cardY + cardH - 10 }, thickness: 0.4, color: C.boxBdr });

    // ── Content ───────────────────────────────────────────────────
    const cx = ML + iconW + 14;
    const maxW = CW - iconW - 18;

    // Subject title (number + code — name)
    const titleStr = `${idx}. ${m.codigo}  —  ${m.nombre}`;
    const titleLines = this.wrap(titleStr, 10.5, maxW, true);
    let ty = cardY + cardH - 16;
    for (const tl of titleLines.slice(0, 2)) {
      this.put(tl, cx, ty, 10.5, C.text, true, false, maxW);
      ty -= 14;
    }

    // Separator
    ty -= 3;
    this.pg.drawLine({ start: { x: cx, y: ty }, end: { x: ML + CW - 8, y: ty }, thickness: 0.4, color: C.boxBdr });
    ty -= 10;

    // Detail rows
    const details = [
      `Semestre ${m.semestre}  ·  ${m.creditos} créditos`,
      `Profesor/a: ${m.profesor}`,
      `Horario: ${m.horario}  ·  Aula: ${m.aula || '—'}`,
    ];
    for (const d of details) {
      this.put(d, cx, ty, 9, C.sub, false, false, maxW);
      ty -= 12.5;
    }

    this.y = cardY - 14;
  }

  /**
   * Page footers on all pages:
   *   • Italic tagline centred
   *   • Gold dot grid (bottom-right)
   *   • Thin gold rule above tagline
   */
  footers() {
    for (const pg of this.pages) {
      // Gold rule
      pg.drawLine({ start: { x: ML, y: 64 }, end: { x: PW - MR, y: 64 }, thickness: 0.8, color: C.gold });

      // Italic tagline centred
      const tagline = 'Formando líderes con propósito.';
      const tw = this.fi.widthOfTextAtSize(tagline, 11);
      pg.drawText(tagline, { x: PW / 2 - tw / 2, y: 46, size: 11, font: this.fi, color: C.navy });

      // Gold dot grid (bottom-right, matches reference)
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
          pg.drawCircle({ x: PW - MR + 10 + col * 7, y: 74 + row * 7, size: 1.6, color: C.gold });
        }
      }
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generarPdfConstancia(data: ConstanciaPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f  = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const fi = await doc.embedFont(StandardFonts.HelveticaOblique);

  const page   = doc.addPage([PW, PH]);
  const layout = new CL(doc, page, f, fb, fi);

  // 1 ─ Header (white, with embedded logo)
  await layout.header(doc);

  // 2 ─ Info row
  layout.infoRow(data.folio, data.emitidoEl, data.periodo);

  // 3 ─ Student data
  layout.studentHeader();
  layout.labelRow('Nombre completo',       data.nombre);
  layout.labelRow('Correo institucional',  data.email);
  layout.labelRow('Carrera',               data.carrera);
  layout.gap(18);

  // 4 ─ Section I
  layout.sectionBadge('I.', 'Constancia de inscripción de materias');
  layout.para(
    `Por medio de la presente se certifica que el/la estudiante antes identificado/a se encuentra ` +
    `debidamente inscrito/a en ${data.materias.length} materia(s) del periodo académico vigente, ` +
    `según consta en el registro oficial de la plataforma institucional:`,
    10.5, C.text, 16
  );

  if (data.materias.length === 0) {
    layout.para(
      'No registra materias con inscripción aprobada al momento de la emisión de este documento.',
      10, C.sub, 12
    );
  } else {
    for (let i = 0; i < data.materias.length; i++) {
      layout.materiaCard(i + 1, data.materias[i]!);
    }
  }

  layout.gap(12);

  // 5 ─ Section II
  layout.sectionBadge('II.', 'Constancia de solvencia académica');
  layout.para(
    `La Universidad Luterana Salvadoreña hace constar que el/la estudiante referido/a se encuentra ` +
    `SOLVENTE en los aspectos académicos verificados en la plataforma al momento de emitir este ` +
    `documento, sin pendientes de inscripción irregular ni observaciones registradas en el sistema.`,
    10.5, C.text, 12
  );
  layout.para(
    `La presente constancia reúne en un solo instrumento la certificación de inscripción de materias ` +
    `(Sección I) y la declaración de solvencia académica (Sección II), con validez para los trámites ` +
    `internos y externos que requieran ambos comprobantes en un único documento.`,
    10, C.sub, 8
  );

  // 6 ─ Decorative corner triangles (all pages)
  layout.triangles();

  // 7 ─ Footer (all pages)
  layout.footers();

  return doc.save();
}

/** @deprecated usar generarPdfConstancia */
export const generarPdfSolvencia = generarPdfConstancia;
