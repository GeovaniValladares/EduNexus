/**
 * Harvard-style ATS-compatible CV generator using pdf-lib.
 *
 * Design principles:
 *  • Single column — ATS parsers read left-to-right, top-to-bottom
 *  • Helvetica (standard font, universally available) — no embedded custom fonts needed
 *  • No tables, no text boxes, no overlapping elements
 *  • Clear section headings with a thin rule — readable by both humans and ATS
 *  • Consistent left margin — ATS expects predictable column alignment
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib';
import type { CvFormData } from './cv-form';

// ── Page constants ────────────────────────────────────────────────────────────
const W   = 595;   // A4 width  (pt)
const H   = 842;   // A4 height (pt)
const ML  = 52;    // left margin
const MR  = 52;    // right margin
const CW  = W - ML - MR;   // content width
const MT  = 52;    // top margin (first page)

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  name:    rgb(0.08, 0.18, 0.38),   // dark navy — name
  heading: rgb(0.08, 0.18, 0.38),   // dark navy — section headings
  text:    rgb(0.12, 0.13, 0.15),   // near-black — body text
  sub:     rgb(0.30, 0.32, 0.37),   // mid-grey — sub-labels
  rule:    rgb(0.08, 0.18, 0.38),   // navy rule under name
  secRule: rgb(0.72, 0.77, 0.84),   // light grey rule under sections
  bullet:  rgb(0.08, 0.18, 0.38),   // navy bullets
  page:    rgb(0.42, 0.46, 0.53),   // grey — "Page X of Y"
};

// ── PDF layout engine ─────────────────────────────────────────────────────────
class CvLayout {
  private doc: PDFDocument;
  private pages: PDFPage[] = [];
  private cur = 0;          // index into pages[]
  private y = 0;
  private readonly f: PDFFont;
  private readonly fb: PDFFont;
  private readonly fi: PDFFont;

  constructor(doc: PDFDocument, f: PDFFont, fb: PDFFont, fi: PDFFont) {
    this.doc = doc;
    this.f = f;
    this.fb = fb;
    this.fi = fi;
    this.addPage();
    this.y = H - MT;
  }

  private addPage() {
    const p = this.doc.addPage([W, H]);
    this.pages.push(p);
    this.cur = this.pages.length - 1;
  }

  private get page(): PDFPage { return this.pages[this.cur]!; }

  private ensureY(needed: number) {
    if (this.y - needed < 52) {
      this.addPage();
      this.y = H - MT;
    }
  }

  private tw(text: string, size: number, bold = false, italic = false): number {
    const fnt = bold ? this.fb : italic ? this.fi : this.f;
    return fnt.widthOfTextAtSize(text, size);
  }

  private drawText(
    text: string, x: number, y: number, size: number,
    color: RGB, bold = false, italic = false, maxWidth?: number
  ) {
    const fnt = bold ? this.fb : italic ? this.fi : this.f;
    this.page.drawText(text, { x, y, size, font: fnt, color, maxWidth });
  }

  // Wrap text into lines, respecting maxWidth
  private wrap(text: string, size: number, maxW: number, bold = false): string[] {
    const fnt = bold ? this.fb : this.f;
    const words = text.replace(/\n/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines: string[] = [];
    let cur = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const trial = cur + ' ' + words[i]!;
      if (fnt.widthOfTextAtSize(trial, size) <= maxW) { cur = trial; }
      else { lines.push(cur); cur = words[i]!; }
    }
    lines.push(cur);
    return lines;
  }

  // ── Public drawing primitives ─────────────────────────────────────────────

  /** Full-width horizontal rule */
  rule(thickness = 0.5, color = C.secRule, gapAfter = 8) {
    this.ensureY(12);
    this.page.drawLine({ start: { x: ML, y: this.y }, end: { x: W - MR, y: this.y }, thickness, color });
    this.y -= gapAfter;
  }

  /** Vertical gap */
  gap(pts: number) { this.y -= pts; }

  /** Single text line (no wrap) */
  line(
    text: string, size: number, color: RGB,
    bold = false, italic = false, align: 'left'|'center'|'right' = 'left'
  ) {
    this.ensureY(size * 1.4);
    let x = ML;
    if (align === 'center') x = ML + (CW - this.tw(text, size, bold, italic)) / 2;
    if (align === 'right')  x = W - MR - this.tw(text, size, bold, italic);
    this.drawText(text, x, this.y, size, color, bold, italic);
    this.y -= size * 1.45;
  }

  /** Wrapped paragraph, left-aligned */
  paragraph(text: string, size = 10, color = C.text, bold = false, italic = false, afterGap = 7) {
    const lines = this.wrap(text, size, CW, bold);
    for (const ln of lines) {
      this.ensureY(size * 1.5);
      this.drawText(ln, ML, this.y, size, color, bold, italic);
      this.y -= size * 1.5;
    }
    this.y -= afterGap;
  }

  /** Section heading: bold navy + thin grey rule below */
  section(title: string) {
    this.ensureY(32);
    this.y -= 4;
    this.drawText(title.toUpperCase(), ML, this.y, 10, C.heading, true);
    this.y -= 14;
    this.rule(0.75, C.heading, 10);
  }

  /**
   * Entry row: bold title on left, optional date/location on right
   * Sub-title in italic grey underneath
   */
  entry(title: string, right: string, subtitle?: string) {
    this.ensureY(subtitle ? 42 : 28);
    // title left, date right
    const dateW = this.tw(right, 9.5);
    const titleMaxW = CW - dateW - 8;
    // Wrap title if long
    const titleLines = this.wrap(title, 10.5, titleMaxW, true);
    const startY = this.y;
    for (const ln of titleLines) {
      this.drawText(ln, ML, this.y, 10.5, C.text, true);
      this.y -= 14;
    }
    // Draw right-aligned date at same y as first title line
    this.drawText(right, W - MR - dateW, startY, 9.5, C.sub);
    if (subtitle) {
      this.drawText(subtitle, ML, this.y, 9.5, C.sub, false, true);
      this.y -= 14;
    }
    this.y -= 5;
  }

  /** Bullet point with left indent */
  bullet(text: string, size = 10, indent = 14) {
    const maxW = CW - indent - 6;
    const lines = this.wrap(text, size, maxW);
    for (let i = 0; i < lines.length; i++) {
      this.ensureY(size * 1.5);
      if (i === 0) {
        // Draw a small filled circle
        this.page.drawCircle({ x: ML + indent - 8, y: this.y + size * 0.35, size: 1.8, color: C.bullet });
      }
      this.drawText(lines[i]!, ML + indent, this.y, size, C.text);
      this.y -= size * 1.5;
    }
  }

  /** Inline skill pills (comma-separated skills on one or more lines) */
  skillLine(skills: string, size = 9.5) {
    const items = skills.split(/[,·•\n]+/).map((s) => s.trim()).filter(Boolean);
    let x = ML;
    const lineH = size * 1.6;
    this.ensureY(lineH);
    for (const sk of items) {
      const sw = this.tw(sk, size) + 12;
      if (x + sw > W - MR) {
        x = ML;
        this.y -= lineH;
        this.ensureY(lineH);
      }
      // Draw pill background
      this.page.drawRectangle({
        x: x - 1, y: this.y - 2,
        width: sw, height: size + 6,
        color: rgb(0.93, 0.95, 0.98),
        borderColor: rgb(0.78, 0.83, 0.91),
        borderWidth: 0.5,
      });
      this.drawText(sk, x + 5, this.y, size, C.text);
      x += sw + 5;
    }
    this.y -= lineH + 6;
  }

  /** "Page X of Y" footer on all pages */
  finalise() {
    const total = this.pages.length;
    for (let i = 0; i < this.pages.length; i++) {
      const pg = this.pages[i]!;
      const label = `Página ${i + 1} de ${total}`;
      const tw = this.f.widthOfTextAtSize(label, 7.5);
      pg.drawText(label, {
        x: W / 2 - tw / 2, y: 28,
        size: 7.5, font: this.f, color: C.page,
      });
      // Bottom rule
      pg.drawLine({ start: { x: ML, y: 40 }, end: { x: W - MR, y: 40 }, thickness: 0.4, color: C.secRule });
      // "ATS-optimised" note
      pg.drawText('CV generado en Edunexus · Universidad Luterana Salvadoreña', {
        x: ML, y: 28, size: 6.5, font: this.f, color: C.page,
      });
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generarCvPdf(form: CvFormData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f  = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const fi = await doc.embedFont(StandardFonts.HelveticaOblique);

  const layout = new CvLayout(doc, f, fb, fi);

  // ── NAME & CONTACT HEADER ──────────────────────────────────────────────────
  layout.line(form.nombreCompleto.toUpperCase(), 18, C.name, true, false, 'center');
  layout.gap(-2);

  const contactParts: string[] = [];
  if (form.ciudad?.trim())   contactParts.push(form.ciudad.trim());
  if (form.email?.trim())    contactParts.push(form.email.trim());
  if (form.telefono?.trim()) contactParts.push(form.telefono.trim());
  if (form.linkedin?.trim()) contactParts.push(form.linkedin.trim());
  layout.line(contactParts.join('  ·  '), 9, C.sub, false, false, 'center');
  layout.gap(4);
  layout.rule(1.2, C.rule, 14);

  // ── PERFIL PROFESIONAL ─────────────────────────────────────────────────────
  if (form.perfil?.trim()) {
    layout.section('Perfil profesional');
    layout.paragraph(form.perfil.trim(), 10.5, C.text, false, false, 8);
    layout.gap(6);
  }

  // ── FORMACIÓN ACADÉMICA ────────────────────────────────────────────────────
  if (form.formacion?.trim()) {
    layout.section('Formación académica');
    const lines = form.formacion.trim().split('\n').filter(Boolean);
    for (let i = 0; i < lines.length; i += 2) {
      const institution = lines[i] ?? '';
      const degree      = lines[i + 1] ?? '';
      layout.entry(institution, '', degree || undefined);
    }
    layout.gap(6);
  }

  // ── HABILIDADES ────────────────────────────────────────────────────────────
  if (form.habilidades?.trim()) {
    layout.section('Habilidades');
    layout.skillLine(form.habilidades.trim());
    layout.gap(6);
  }

  // ── EXPERIENCIA ────────────────────────────────────────────────────────────
  if (form.experiencia?.trim()) {
    layout.section('Experiencia');
    const blocks = form.experiencia.trim().split(/\n{2,}/);
    for (const block of blocks) {
      const blines = block.split('\n').filter(Boolean);
      if (!blines.length) continue;
      const title = blines[0]!;
      // Check if second line looks like a subtitle (no leading dash/bullet)
      const hasSubtitle = blines.length > 1 && !blines[1]!.startsWith('-') && !blines[1]!.startsWith('•');
      const subtitle    = hasSubtitle ? blines[1]! : undefined;
      const bodyStart   = hasSubtitle ? 2 : 1;
      layout.entry(title, '', subtitle);
      for (let i = bodyStart; i < blines.length; i++) {
        const raw = blines[i]!.replace(/^[-•]\s*/, '');
        layout.bullet(raw);
      }
      layout.gap(4);
    }
  }

  // ── PROYECTOS ACADÉMICOS ───────────────────────────────────────────────────
  if (form.proyectos?.trim()) {
    layout.section('Proyectos académicos');
    const blocks = form.proyectos.trim().split(/\n{2,}/);
    for (const block of blocks) {
      const blines = block.split('\n').filter(Boolean);
      if (!blines.length) continue;
      // If single line, render as bullet; if multi-line, first is title, rest are bullets
      if (blines.length === 1) {
        layout.bullet(blines[0]!.replace(/^[-•]\s*/, ''));
      } else {
        layout.entry(blines[0]!.replace(/^[-•]\s*/, ''), '');
        for (let i = 1; i < blines.length; i++) {
          layout.bullet(blines[i]!.replace(/^[-•]\s*/, ''));
        }
        layout.gap(2);
      }
    }
    layout.gap(6);
  }

  // ── MATERIAS CURSADAS ──────────────────────────────────────────────────────
  if (form.materias?.trim()) {
    layout.section('Materias cursadas / en curso');
    const matLines = form.materias.trim().split('\n').filter(Boolean);
    for (const m of matLines) {
      layout.bullet(m.replace(/^[•\-]\s*/, ''), 9.5);
    }
    layout.gap(6);
  }

  // ── IDIOMAS ────────────────────────────────────────────────────────────────
  if (form.idiomas?.trim()) {
    layout.section('Idiomas');
    const idiomaLines = form.idiomas.trim().split('\n').filter(Boolean);
    for (const line of idiomaLines) {
      const [lang, level] = line.split(/—|-/).map((s) => s.trim());
      if (lang && level) {
        layout.entry(lang, level);
      } else {
        layout.bullet(line.replace(/^[•\-]\s*/, ''), 9.5);
      }
    }
    layout.gap(4);
  }

  // ── FOOTER ON ALL PAGES ────────────────────────────────────────────────────
  layout.finalise();

  return doc.save();
}
