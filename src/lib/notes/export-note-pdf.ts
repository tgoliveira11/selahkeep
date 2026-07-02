const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 15;
const RENDER_WIDTH_PX = 800;

function sanitizeFileName(title: string): string {
  const trimmed = title.trim() || "note";
  return trimmed.replace(/[\\/:*?"<>|]/g, "-").slice(0, 100);
}

function buildExportContainer(title: string, bodyHtml: string): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-99999px";
  container.style.width = `${RENDER_WIDTH_PX}px`;
  container.style.padding = "32px";
  container.style.background = "#ffffff";
  container.style.color = "#111111";
  container.style.fontFamily = "Georgia, 'Times New Roman', serif";

  const titleEl = document.createElement("h1");
  titleEl.textContent = title;
  titleEl.style.fontSize = "24px";
  titleEl.style.lineHeight = "1.3";
  titleEl.style.marginBottom = "20px";
  container.appendChild(titleEl);

  const bodyEl = document.createElement("div");
  bodyEl.innerHTML = bodyHtml;
  bodyEl.style.fontSize = "14px";
  bodyEl.style.lineHeight = "1.6";
  container.appendChild(bodyEl);

  return container;
}

/**
 * Renders a note (already-sanitized HTML) to a paginated PDF and triggers a
 * browser download. Runs entirely client-side — the rendered canvas never
 * leaves the device, so nothing is uploaded for this export.
 */
export async function exportNoteToPdf(title: string, bodyHtml: string): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const container = buildExportContainer(title, bodyHtml);
  document.body.appendChild(container);

  try {
    // scale 1.5 is plenty sharp for print/reading and keeps the captured
    // canvas (and therefore the embedded page images) reasonably sized.
    const canvas = await html2canvas(container, { backgroundColor: "#ffffff", scale: 1.5 });
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const contentWidthMm = A4_WIDTH_MM - MARGIN_MM * 2;
    const contentHeightMm = A4_HEIGHT_MM - MARGIN_MM * 2;
    const pageHeightPx = (contentHeightMm * canvas.width) / contentWidthMm;

    let renderedHeightPx = 0;
    let firstPage = true;
    while (renderedHeightPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) break;
      // Flatten onto white first: JPEG has no alpha channel, and the source
      // canvas can have transparent gaps past the note's actual content.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        renderedHeightPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );

      if (!firstPage) doc.addPage();
      const sliceHeightMm = (sliceHeightPx * contentWidthMm) / canvas.width;
      // JPEG compresses this rasterized text/background content far better
      // than lossless PNG — this is the difference between a multi-hundred-MB
      // and a few-hundred-KB file for a typical note.
      doc.addImage(
        pageCanvas.toDataURL("image/jpeg", 0.82),
        "JPEG",
        MARGIN_MM,
        MARGIN_MM,
        contentWidthMm,
        sliceHeightMm
      );
      firstPage = false;
      renderedHeightPx += sliceHeightPx;
    }

    doc.save(`${sanitizeFileName(title)}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
