import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
} from 'docx';

// build a plain-text summary from nodes/edges
function buildSummary(title: string, nodes: any[], edges: any[]) {
  const lines: string[] = [];
  lines.push(`Workflow: ${title || 'Untitled'}`);
  lines.push('');
  lines.push('Nodes:');
  nodes.forEach((n) => {
    const label = n?.data?.label ?? (n?.data?.nodeData?.title ?? '');
    lines.push(`- ${n.id} (${n.type}) — ${label}`);
    if (n?.data?.nodeData) {
      const nd = n.data.nodeData;
      if (nd?.type) lines.push(`   • nodeType: ${nd.type}`);
      if (nd?.description) lines.push(`   • desc: ${nd.description}`);
    }
  });
  lines.push('');
  lines.push('Edges:');
  edges.forEach((e) => {
    const label = e?.label ? ` [${e.label}]` : '';
    lines.push(
      `- ${e.source}${e.sourceHandle ? `:${e.sourceHandle}` : ''} -> ${e.target}${e.targetHandle ? `:${e.targetHandle}` : ''}${label}`
    );
  });
  return lines.join('\n');
}

// build a structured representation for a professional document
function buildStructured(title: string, nodes: any[], edges: any[]) {
  const docTitle = title || 'Untitled workflow';
  const metadata = [
    `Nodes: ${nodes?.length ?? 0}`,
    `Edges: ${edges?.length ?? 0}`,
    `Exported: ${new Date().toLocaleString()}`,
  ];

  const nodeSections = (nodes || []).map((n: any) => {
    const label = n?.data?.label ?? n?.data?.nodeData?.title ?? `Node ${n.id}`;
    const type = n?.data?.nodeData?.type ?? n?.type ?? 'unknown';
    const description = n?.data?.nodeData?.description ?? n?.data?.nodeData?.details ?? '';
    const details: string[] = [];

    // include several useful fields if present
    if (n?.data?.nodeData) {
      const nd = n.data.nodeData;
      if (nd?.assignee) details.push(`Assignee: ${nd.assignee}`);
      if (nd?.due) details.push(`Due: ${nd.due}`);
      if (nd?.condition) details.push(`Condition: ${nd.condition}`);
    }

    // fallback: include raw node data JSON for completeness
    details.push(`Raw data: ${JSON.stringify(n?.data ?? {}, null, 2)}`);

    return {
      id: n?.id,
      heading: `${label} — ${type}`,
      paragraphs: [description || `No description provided.`, ...details],
      x: n?.data?.nodeData?.x,
      y: n?.data?.nodeData?.y,
      shortLabel: label,
      type,
    };
  });

  const edgeList = (edges || []).map((e: any) => {
    const lbl = e?.label ? ` — ${String(e.label)}` : '';
    const srcH = e?.sourceHandle ? `:${e.sourceHandle}` : '';
    const tgtH = e?.targetHandle ? `:${e.targetHandle}` : '';
    return {
      raw: `Edge ${e.id ?? ''}: ${e.source}${srcH} → ${e.target}${tgtH}${lbl}`,
      source: e.source,
      target: e.target,
    };
  });

  return {
    title: docTitle,
    metadata,
    nodeSections,
    edgeList,
  };
}

// generate a simple SVG diagram (limited nodes to avoid huge output)
function buildDiagramSvg(structured: ReturnType<typeof buildStructured>, maxNodes = 30) {
  const nodes = structured.nodeSections.slice(0, maxNodes);
  // collect positions
  const xs = nodes.map((n) => (typeof n.x === 'number' ? n.x : null)).filter((v) => v !== null) as number[];
  const ys = nodes.map((n) => (typeof n.y === 'number' ? n.y : null)).filter((v) => v !== null) as number[];

  // fallback layout if positions missing
  const hasCoords = xs.length > 0 && ys.length > 0;
  const padding = 20;
  const width = 900;
  const height = 500;

  // map positions to canvas coordinates
  let mapped: { id: any; x: number; y: number; label: string; type: string }[] = [];
  if (hasCoords) {
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    mapped = nodes.map((n, i) => {
      const nx = typeof n.x === 'number' ? ((n.x - minX) / spanX) * (width - padding * 2) + padding : (i % 6) * 120 + padding;
      const ny = typeof n.y === 'number' ? ((n.y - minY) / spanY) * (height - padding * 2) + padding : Math.floor(i / 6) * 80 + padding;
      return { id: n.id, x: nx, y: ny, label: n.shortLabel, type: n.type };
    });
  } else {
    mapped = nodes.map((n, i) => ({ id: n.id, x: (i % 6) * 140 + padding, y: Math.floor(i / 6) * 90 + padding, label: n.shortLabel, type: n.type }));
  }

  // simple edges: connect by index if possible (best-effort)
  // we just draw arrows between nodes with same ids matching edgeList source/target if found in mapped set
  const nodeIdIndex = new Map(mapped.map((m) => [String(m.id), m]));
  const edges = structured.edgeList
    .map((e) => {
      const s = nodeIdIndex.get(String(e.source));
      const t = nodeIdIndex.get(String(e.target));
      if (s && t) return { x1: s.x, y1: s.y, x2: t.x, y2: t.y };
      return null;
    })
    .filter(Boolean) as any[];

  // build SVG
  const nodeRects = mapped
    .map((m, i) => {
      const w = 140;
      const h = 36;
      const rx = 6;
      const tx = m.x - w / 2 + 8;
      const ty = m.y - h / 2 + 6;
      const color =
        m.type === 'action' ? '#D1FAE5' : m.type === 'decision' ? '#FEF3C7' : m.type === 'exception' ? '#FEE2E2' : m.type === 'human' ? '#EDE9FE' : '#EFF6FF';
      return `<g key="${i}">
        <rect x="${tx}" y="${ty}" width="${w}" height="${h}" rx="${rx}" fill="${color}" stroke="#cbd5e1" />
        <text x="${m.x}" y="${m.y + 4}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#0f172a">${escapeXml(m.label)}</text>
      </g>`;
    })
    .join('\n');

  const edgePaths = edges
    .map((ed) => {
      // draw straight lines with arrow marker
      return `<path d="M ${ed.x1} ${ed.y1} L ${ed.x2} ${ed.y2}" stroke="#94a3b8" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>`;
    })
    .join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
      </marker>
      <style>
        text { font-family: Inter,Arial,Helvetica,sans-serif; }
      </style>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff"/>
    <g>
      ${edgePaths}
      ${nodeRects}
    </g>
  </svg>`;

  return { svg, width, height };
}

function escapeXml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// convert SVG string to PNG data URL (browser)
function svgToPngDataUrl(svg: string, width: number, height: number, scale = 1) {
  return new Promise<string>((resolve, reject) => {
    try {
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas 2D context unavailable');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('SVG load failed'));
      };
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

async function downloadPdfFormatted(structured: ReturnType<typeof buildStructured>, filename: string, diagramPng?: string, diagramSize?: { w: number; h: number }) {
  try {
    const doc = new jsPDF({ unit: 'pt' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = margin;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(structured.title, margin, y);
    y += 26;

    // If diagram present, embed
    if (diagramPng && diagramSize) {
      const maxW = pageW - margin * 2;
      const scale = Math.min(1, maxW / diagramSize.w);
      const drawW = diagramSize.w * scale;
      const drawH = diagramSize.h * scale;
      doc.addImage(diagramPng, 'PNG', margin, y, drawW, drawH);
      y += drawH + 12;
    }

    // Metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    structured.metadata.forEach((m: string) => {
      doc.text(m, margin, y);
      y += 14;
    });
    y += 8;

    // Nodes (shortened description for PDF)
    structured.nodeSections.forEach((sec) => {
      if (y > doc.internal.pageSize.getHeight() - margin - 80) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(sec.heading, margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const summary = Array.isArray(sec.paragraphs) ? sec.paragraphs[0] : String(sec.paragraphs);
      const lines = doc.splitTextToSize(summary, pageW - margin * 2);
      lines.forEach((ln: string) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(ln, margin, y);
        y += 12;
      });
      y += 8;
    });

    // Edges
    if (structured.edgeList.length) {
      if (y > doc.internal.pageSize.getHeight() - margin - 60) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Edges', margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      structured.edgeList.forEach((el: any) => {
        const lines = doc.splitTextToSize(el.raw, pageW - margin * 2);
        lines.forEach((ln: string) => {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(ln, margin, y);
          y += 12;
        });
        y += 4;
      });
    }

    doc.save(filename);
  } catch (err) {
    console.warn('PDF generation failed, falling back to basic PDF/text blob', err);
    const text = [
      structured.title,
      '',
      ...structured.metadata,
      '',
      'Nodes:',
      ...structured.nodeSections.flatMap((s) => [s.heading, ...s.paragraphs, '']),
      'Edges:',
      ...structured.edgeList.map((e) => e.raw),
    ].join('\n\n');
    const blob = new Blob([text], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

async function downloadDocxFormatted(structured: ReturnType<typeof buildStructured>, filename: string, diagramPng?: string, diagramSize?: { w: number; h: number }) {
  try {
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        text: structured.title,
        heading: HeadingLevel.TITLE,
      })
    );

    // Metadata
    structured.metadata.forEach((m: string) => {
      children.push(
        new Paragraph({
          children: [new TextRun(m)],
        })
      );
    });

    children.push(new Paragraph({}));

    // Diagram image if present (fetch bytes)
    if (diagramPng) {
      try {
        const resp = await fetch(diagramPng);
        const buf = await resp.arrayBuffer();
        const imgRun = new ImageRun({
          data: Buffer.from(buf),
          transformation: {
            width: Math.min(600, diagramSize?.w ?? 600),
            height: Math.min(400, diagramSize?.h ?? 400),
          },
        });
        children.push(new Paragraph({ children: [imgRun] }));
        children.push(new Paragraph({}));
      } catch (e) {
        // ignore image on docx if conversion fails
        console.warn('docx image embed failed', e);
      }
    }

    // Nodes
    structured.nodeSections.forEach((sec) => {
      children.push(
        new Paragraph({
          text: sec.heading,
          heading: HeadingLevel.HEADING_2,
        })
      );
      sec.paragraphs.forEach((p: string) => {
        children.push(new Paragraph({ children: [new TextRun(p)] }));
      });
      children.push(new Paragraph({}));
    });

    // Edges
    if (structured.edgeList.length) {
      children.push(
        new Paragraph({
          text: 'Edges',
          heading: HeadingLevel.HEADING_2,
        })
      );
      structured.edgeList.forEach((el: any) => {
        children.push(new Paragraph({ children: [new TextRun(el.raw)] }));
      });
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn('DOCX generation failed, falling back to .doc text', err);
    const text = [
      structured.title,
      '',
      ...structured.metadata,
      '',
      'Nodes:',
      ...structured.nodeSections.flatMap((s) => [s.heading, ...s.paragraphs, '']),
      'Edges:',
      ...structured.edgeList.map((e) => e.raw),
    ].join('\n\n');
    const blob = new Blob([text], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.docx?$/, '.doc');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

// open a formatted HTML preview in a new tab (includes diagram if present)
function openHtmlPreview(structured: ReturnType<typeof buildStructured>, diagramPng?: string) {
  const escapeHtml = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const nodeHtml = structured.nodeSections
    .map(
      (s) => `
      <section style="margin-bottom:18px;">
        <h2 style="font-size:18px;margin:0 0 6px 0;">${escapeHtml(s.heading)}</h2>
        ${s.paragraphs.map((p) => `<p style="margin:6px 0;color:#333;white-space:pre-wrap;">${escapeHtml(p)}</p>`).join('')}
      </section>`
    )
    .join('');

  const edgesHtml = structured.edgeList.length
    ? `<section><h2 style="font-size:18px;margin:0 0 6px 0;">Edges</h2><ul>${structured.edgeList.map((e) => `<li style="margin:4px 0;color:#333;">${escapeHtml(e.raw)}</li>`).join('')}</ul></section>`
    : '';

  const diagramHtml = diagramPng ? `<div style="margin:12px 0;"><img src="${diagramPng}" style="max-width:100%;border:1px solid #e6e9ef;border-radius:6px"/></div>` : '';

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <title>${escapeHtml(structured.title)} — Preview</title>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <style>
        body{font-family:Inter, ui-sans-serif,system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#0f172a; padding:28px; line-height:1.45}
        h1{font-size:24px;margin:0 0 8px 0}
        h2{font-size:18px;margin:12px 0}
        .meta{color:#6b7280;margin-bottom:16px}
        pre{background:#f3f4f6;padding:10px;border-radius:6px;white-space:pre-wrap}
      </style>
    </head>
    <body>
      <h1>${escapeHtml(structured.title)}</h1>
      <div class="meta">${structured.metadata.map((m) => escapeHtml(m)).join(' • ')}</div>
      ${diagramHtml}
      ${nodeHtml}
      ${edgesHtml}
    </body>
  </html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  // revoke after a short delay so the tab can load the blob
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  if (!win) {
    // fallback: navigate current window if popup blocked
    window.location.href = url;
  }
}

interface Props {
  title?: string;
  nodes: any[];
  edges: any[];
}

export default function ExportControls({ title, nodes, edges }: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [diagramPng, setDiagramPng] = useState<string | null>(null);
  const [diagramSize, setDiagramSize] = useState<{ w: number; h: number } | null>(null);

  // Make a compact payload for the AI to avoid context-length issues.
  function compactForAi(structured: ReturnType<typeof buildStructured>, maxNodes = 40, maxEdges = 120) {
    const nodes = structured.nodeSections.slice(0, maxNodes).map((n) => ({
      id: n.id,
      title: n.shortLabel ?? n.heading,
      type: n.type,
      short: String(n.paragraphs?.[0] ?? '').slice(0, 240), // short description
      x: n.x,
      y: n.y,
    }));
    const edges = structured.edgeList.slice(0, maxEdges).map((e) => ({
      raw: e.raw,
      source: e.source,
      target: e.target,
    }));
    return {
      title: structured.title,
      metadata: structured.metadata,
      nodes,
      edges,
      note:
        `Payload trimmed for token limits. Sent ${nodes.length} of ${structured.nodeSections.length} nodes ` +
        `and ${edges.length} of ${structured.edgeList.length} edges. If you require more detail, ask for it in the ` +
        `recommendations section.`,
    };
  }

  // POST to server with simple retry/backoff for 429 rate limits
  async function postWithRetry(url: string, body: any, attempts = 3) {
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < attempts) {
      attempt++;
      try {
        console.log(`AI request attempt ${attempt}`);
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const text = await resp.text();
        return { resp, text };
      } catch (err) {
        lastErr = err;
        // network error: wait and retry
        const wait = 500 * attempt;
        console.warn('AI request network error, retrying after', wait, 'ms', err);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw lastErr;
  }

  const handleExportPDF = async () => {
    const structured = buildStructured(title || 'Untitled', nodes || [], edges || []);
    await downloadPdfFormatted(structured, `${(title || 'workflow').replace(/\s+/g, '_')}.pdf`, diagramPng ?? undefined, diagramSize ?? undefined);
  };

  const handleExportWord = async () => {
    const structured = buildStructured(title || 'Untitled', nodes || [], edges || []);
    await downloadDocxFormatted(structured, `${(title || 'workflow').replace(/\s+/g, '_')}.docx`, diagramPng ?? undefined, diagramSize ?? undefined);
  };

  const handlePreview = () => {
    const structured = buildStructured(title || 'Untitled', nodes || [], edges || []);
    openHtmlPreview(structured, diagramPng ?? undefined);
  };

  // AI narrative + diagram
  const handleAiNarrative = async () => {
    setAiLoading(true);
    try {
      const structured = buildStructured(title || 'Untitled', nodes || [], edges || []);
      // compact payload to avoid context_length_exceeded
      const compact = compactForAi(structured, 40, 120);
      console.log('Sending compact AI payload:', compact);

      // use retry helper to handle transient 429s
      const { resp, text } = await postWithRetry('/api/generate-report', compact, 4);
      console.log('AI API raw response text:', text, 'status:', resp.status);

      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        console.warn('Failed to parse server JSON response', parseErr);
        json = { raw: text };
      }

      if (!resp.ok || json?.error) {
        const details = json?.details ?? json?.raw ?? json?.error ?? 'Unknown error';
        console.error('AI report error', { status: resp.status, details });
        window.alert(`AI generation failed: ${resp.status} — ${String((details?.error?.message) ?? details).slice(0, 300)}`);
        openHtmlPreview(structured, undefined);
        setAiResult(null);
        return;
      }

      const result: any = json.result;
      let executiveText = '';
      if (result && typeof result === 'object') {
        if (result.executive_summary) executiveText = typeof result.executive_summary === 'string' ? result.executive_summary : JSON.stringify(result.executive_summary);
        else if (result.raw) executiveText = String(result.raw);
        else executiveText = JSON.stringify(result, null, 2);
      } else executiveText = String(result || '');

      const execSection = {
        id: '__EXEC__',
        heading: 'Executive summary (AI)',
        paragraphs: [executiveText],
        x: 0,
        y: 0,
        shortLabel: 'Executive summary',
        type: 'summary',
      };

      const combined: any = {
        ...structured,
        nodeSections: [execSection, ...structured.nodeSections],
      };

      const { svg, width, height } = buildDiagramSvg(combined, 30);
      let png: string | null = null;
      try {
        png = await svgToPngDataUrl(svg, width, height, 1);
        setDiagramPng(png);
        setDiagramSize({ w: width, h: height });
      } catch (e) {
        console.warn('diagram PNG conversion failed', e);
        setDiagramPng(null);
        setDiagramSize(null);
        png = null;
      }

      setAiResult(result);
      openHtmlPreview(combined, png ?? undefined);
    } catch (err) {
      console.error('AI narrative fetch failed', err);
      window.alert(`AI generation failed: ${String(err).slice(0, 300)}`);
      const structured = buildStructured(title || 'Untitled', nodes || [], edges || []);
      openHtmlPreview(structured, undefined);
      setAiResult(null);
      setDiagramPng(null);
      setDiagramSize(null);
    } finally {
      setAiLoading(false);
    }
  };

  // when exporting AI-enhanced, prepend a full exec section similarly
  const handleExportAiPdf = async () => {
    const structured = buildStructured(title || 'Untitled', nodes || [], edges || []);
    if (aiResult) {
      const exec = typeof aiResult === 'object' && aiResult.executive_summary ? (typeof aiResult.executive_summary === 'string' ? aiResult.executive_summary : JSON.stringify(aiResult.executive_summary)) : JSON.stringify(aiResult);
      const execSection = {
        id: '__EXEC__',
        heading: 'Executive summary (AI)',
        paragraphs: [exec],
        x: 0,
        y: 0,
        shortLabel: 'Executive summary',
        type: 'summary',
      };
      structured.nodeSections.unshift(execSection);
    }
    await downloadPdfFormatted(structured, `${(title || 'workflow').replace(/\s+/g, '_')}_AI.pdf`, diagramPng ?? undefined, diagramSize ?? undefined);
  };

  const handleExportAiDocx = async () => {
    const structured = buildStructured(title || 'Untitled', nodes || [], edges || []);
    if (aiResult) {
      const exec = typeof aiResult === 'object' && aiResult.executive_summary ? (typeof aiResult.executive_summary === 'string' ? aiResult.executive_summary : JSON.stringify(aiResult.executive_summary)) : JSON.stringify(aiResult);
      const execSection = {
        id: '__EXEC__',
        heading: 'Executive summary (AI)',
        paragraphs: [exec],
        x: 0,
        y: 0,
        shortLabel: 'Executive summary',
        type: 'summary',
      };
      structured.nodeSections.unshift(execSection);
    }
    await downloadDocxFormatted(structured, `${(title || 'workflow').replace(/\s+/g, '_')}_AI.docx`, diagramPng ?? undefined, diagramSize ?? undefined);
  };

  return (
    <div className="flex gap-2 items-center" style={{ zIndex: 100 }}>
      <button type="button" onClick={handlePreview} className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium border border-gray-300 rounded bg-white hover:bg-gray-50" title="Preview">
        Preview
      </button>

      <button
        type="button"
        onClick={handleAiNarrative}
        className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium border border-indigo-300 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
        title="AI Narrative"
      >
        {aiLoading ? 'Generating…' : 'AI Narrative'}
      </button>

      {/* show AI-export buttons when an AI result exists */}
      <button
        type="button"
        onClick={handleExportAiPdf}
        disabled={!aiResult}
        className={`inline-flex items-center justify-center h-10 px-4 text-sm font-medium ${aiResult ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'} rounded`}
        title="Export AI PDF"
      >
        Export AI PDF
      </button>

      <button
        type="button"
        onClick={handleExportAiDocx}
        disabled={!aiResult}
        className={`inline-flex items-center justify-center h-10 px-4 text-sm font-medium ${aiResult ? 'border border-gray-300' : 'bg-gray-100 text-gray-500'} rounded`}
        title="Export AI .docx"
      >
        Export AI .docx
      </button>

      {/* legacy plain exports */}
      <button type="button" onClick={handleExportPDF} className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700" title="Export PDF">
        Export PDF
      </button>
      <button type="button" onClick={handleExportWord} className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50" title="Export Word (.docx)">
        Export .docx
      </button>
    </div>
  );
}