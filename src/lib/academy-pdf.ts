import logoAcademy from "@/assets/connect-academy-logo-v5.png.asset.json";

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type LessonSummaryPdf = {
  courseTitle: string;
  lessonTitle: string;
  summary: string;
  references: string[];
  images: { url: string; caption?: string }[];
};

/** Gera o PDF-resumo da aula: logo, texto acessível, imagens e referências. */
export async function downloadLessonSummaryPdf(data: LessonSummaryPdf) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const logo = await toDataUrl(logoAcademy.url);
  if (logo) {
    doc.addImage(logo, "PNG", margin, y, 150, 50);
    y += 66;
  }

  const nextPageIfNeeded = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(data.courseTitle, margin, y);
  y += 20;

  doc.setFontSize(18);
  doc.setTextColor(20);
  const titleLines = doc.splitTextToSize(data.lessonTitle, width) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 8;

  doc.setFontSize(11);
  doc.setTextColor(40);
  const body = doc.splitTextToSize(data.summary, width) as string[];
  for (const line of body) {
    nextPageIfNeeded(18);
    doc.text(line, margin, y);
    y += 16;
  }

  for (const img of data.images) {
    const dataUrl = await toDataUrl(img.url);
    if (!dataUrl) continue;
    nextPageIfNeeded(240);
    y += 12;
    try {
      doc.addImage(dataUrl, margin, y, width, 200, undefined, "FAST");
      y += 210;
    } catch {
      continue;
    }
    if (img.caption) {
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(img.caption, margin, y);
      y += 16;
      doc.setFontSize(11);
      doc.setTextColor(40);
    }
  }

  if (data.references.length > 0) {
    nextPageIfNeeded(60);
    y += 16;
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text("Referências bibliográficas", margin, y);
    y += 20;
    doc.setFontSize(10);
    doc.setTextColor(60);
    data.references.forEach((ref, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${ref}`, width) as string[];
      for (const line of lines) {
        nextPageIfNeeded(16);
        doc.text(line, margin, y);
        y += 14;
      }
    });
  }

  const safe = data.lessonTitle.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`resumo-${safe || "aula"}.pdf`);
}
