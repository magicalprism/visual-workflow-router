import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const anthropicVersionHeader = '2023-06-01';

type NodeType = 'action' | 'decision' | 'exception' | 'human' | 'terminal';

interface WorkflowNode {
  id: string;
  type?: NodeType;
  title?: string | null;
  x?: number;
  y?: number;
  details?: Record<string, any>;
}

interface WorkflowEdge {
  id?: string;
  from_node_id: string;
  to_node_id: string;
  label?: string | null;
  style?: 'solid' | 'dashed';
}

interface GeneratedWorkflow {
  title?: string;
  description?: string;
  domain?: string;
  version?: number | string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export async function POST(req: Request) {
  console.log('/api/generate-workflow: POST start');
  try {
    // read body safely
    let requestBody: any = {};
    try { requestBody = await req.json(); } catch {
      try { const t = await req.text(); requestBody = t ? JSON.parse(t) : {}; } catch { requestBody = {}; }
    }

    const prompt = requestBody?.prompt ?? requestBody?.input ?? '<no prompt provided>';
    if (!anthropicApiKey) return NextResponse.json({ error: 'Server misconfigured: missing ANTHROPIC_API_KEY' }, { status: 500 });

    const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3';
    // stronger instruction: require nodes & edges arrays, require non-empty titles, prefer compact JSON only
    const systemInstruction = `You MUST respond with a single JSON object only. Return ONLY valid JSON (no surrounding text or markdown).
The JSON MUST follow this schema exactly:
{
  "title": string,
  "description": string,
  "domain": string,
  "version": number,
  "nodes": [{ "id": string, "type": "action"|"decision"|"exception"|"human"|"terminal", "title": string, "x": number, "y": number, "details": object }],
  "edges": [{ "id": string, "from_node_id": string, "to_node_id": string, "label"?: string, "style"?: "solid"|"dashed" }]
}
- Every node.title must be a non-empty string.
- If the prompt describes branching (yes/no/if/else), include a decision node and edges for each branch.
- If you cannot produce the structure, return {} (an empty object).`;

    const providerUrl = 'https://api.anthropic.com/v1/messages';

    // if the user supplied a mermaid/flowchart, instruct the model to convert it directly
    const isMermaid = typeof prompt === 'string' && /flowchart|graph|sequenceDiagram/i.test(prompt);
    const providerPayloadBase = {
      model: anthropicModel,
      system: systemInstruction,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: isMermaid
                ? [
                    'You will be given a Mermaid flowchart. Convert it to EXACT JSON that matches the following schema (ONLY JSON, no explanation):',
                    systemInstruction,
                    '',
                    'Requirements:',
                    '- Include every node and every edge from the Mermaid input.',
                    '- Node ids should match the labels used in the Mermaid where reasonable (e.g., A, B, EX1).',
                    '- Return at least 8 nodes for non-trivial flows; if the flow has more, include them all.',
                    '- Every node.title must be non-empty.',
                    '',
                    'Mermaid input (convert everything below):',
                    prompt,
                  ].join('\n')
                : String(prompt),
            },
          ],
        },
      ],
      temperature: 0.0,
      // allow larger responses for complex flows
      max_tokens: 8000,
    };

    async function callAnthropic(payload: any, timeoutMs = 45000) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const r = await fetch(providerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey ?? '',
            'anthropic-version': anthropicVersionHeader,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const text = await r.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch {}
        return { ok: r.ok, status: r.status, text, json, stop_reason: (json && json.stop_reason) || null };
      } finally {
        clearTimeout(t);
      }
    }

    const providerResp = await callAnthropic(providerPayloadBase, 45000);
    // Debug: log and persist the full provider response for inspection (remove after debugging)
    console.log('Provider full response length:', providerResp.text?.length ?? 0);
    console.log('Provider full response text (first 5000 chars):', String(providerResp.text).slice(0, 5000));
    try {
      const debugPath = 'C:\\Users\\Lena\\Documents\\providerResp_raw.json';
      fs.writeFileSync(debugPath, String(providerResp.text || ''), { encoding: 'utf8' });
      console.log('Wrote providerResp.text to', debugPath);
    } catch (e) {
      console.warn('Failed to write providerResp to disk', e);
    }
    if (!providerResp.ok) {
      console.error('Anthropic call failed', providerResp.status, providerResp.text);
      return NextResponse.json({ error: 'Anthropic API error', detail: providerResp.text }, { status: 502 });
    }

    // permissive extraction
    function extractText(obj: any): string {
      const candidates: string[] = [];
      const seen = new Set<any>();
      function walk(x: any) {
        if (!x || seen.has(x)) return;
        seen.add(x);
        if (typeof x === 'string') { candidates.push(x); return; }
        if (Array.isArray(x)) { x.forEach(walk); return; }
        if (typeof x === 'object') {
          const preferred = ['text', 'content', 'output', 'completion', 'response', 'message'];
          for (const k of preferred) if (k in x) walk(x[k]);
          for (const k of Object.keys(x)) if (!preferred.includes(k)) walk(x[k]);
        }
      }
      walk(obj);
      candidates.sort((a, b) => b.length - a.length);
      return candidates[0] ?? '';
    }

    let contentStr = extractText(providerResp.json) || providerResp.text || JSON.stringify(providerResp.json || {});
    console.log('Provider raw preview:', contentStr.slice(0, 1000));

    // helper: unescape common JSON-escaped sequences when provider wrapped JSON inside a string
    function unescapeSequences(s: string): string {
      if (!s || typeof s !== 'string') return s;
      // only run when escaped sequences look present
      if (!/\\n|\\r|\\t|\\"|\\\\/.test(s)) return s;
      return s
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }

    // robust JSON parse helpers (updated to unescape sequences before parsing)
    function stripFences(s: string) { return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, ''); }

    function tryParseRobust(text: string): any | null {
      if (!text || typeof text !== 'string') return null;
      // Unescape typical JSON-in-string sequences first
      const unescaped = unescapeSequences(text);
      const stripped = stripFences(unescaped);
      // direct parse
      try { return JSON.parse(stripped); } catch {}
      // fenced block parse (accept either explicit ```json or generic fences)
      const fenced = stripped.match(/```json\s*([\s\S]*?)```/i) || stripped.match(/```([\s\S]*?)```/);
      if (fenced?.[1]) {
        try { return JSON.parse(unescapeSequences(fenced[1].trim())); } catch {}
      }
      // Attempt to find the largest balanced {...} substring that parses as JSON
      let best: any = null;
      let bestLen = 0;
      const s = stripped;
      const starts: number[] = [];
      for (let i = 0; i < s.length; i++) if (s[i] === '{') starts.push(i);
      for (const start of starts) {
        let depth = 0;
        for (let j = start; j < s.length; j++) {
          const ch = s[j];
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          if (depth === 0) {
            const candidate = s.slice(start, j + 1);
            try {
              const parsed = JSON.parse(unescapeSequences(candidate));
              const len = candidate.length;
              if (len > bestLen) { best = parsed; bestLen = len; }
            } catch {
              // ignore and continue searching
            }
            break; // move to next opening brace
          }
        }
      }
      if (best !== null) return best;
      // Try extracting a top-level array if present
      const arrFirst = stripped.indexOf('[');
      const arrLast = stripped.lastIndexOf(']');
      if (arrFirst >= 0 && arrLast > arrFirst) {
        try { return JSON.parse(unescapeSequences(stripped.slice(arrFirst, arrLast + 1))); } catch {}
      }
      // final fallback
      try { return JSON.parse(unescapeSequences(stripped)); } catch { return null; }
    }

    // Extract the JSON from the provider response, handling markdown code blocks and escaped newlines
    function extractJsonFromProvider(text: string): any | null {
      if (!text || typeof text !== 'string') return null;
      const s = unescapeSequences(text);
      // Find the first ```json ... ``` block and parse it
      const match = s.match(/```json\s*([\s\S]*?)```/i) || s.match(/```([\s\S]*?)```/);
      if (match && match[1]) {
        let cleaned = '';
        try {
          // Remove leading/trailing whitespace/newlines
          cleaned = match[1].replace(/^\s+|\s+$/g, '');
          return JSON.parse(cleaned);
        } catch (e) {
          // If parsing fails, try to fix common issues (remove trailing commas, etc.)
          const fixed = cleaned
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          try {
            return JSON.parse(fixed);
          } catch (e2) {
            console.warn('Failed to parse JSON from code block:', e2);
          }
        }
      }
      // Fallback: try to find any {...} block and parse
      const braceMatch = s.match(/{[\s\S]*}/);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch[0]);
        } catch (e) {
          console.warn('Failed to parse JSON from braces:', e);
        }
      }
      return null;
    }

    // if truncated or looks incomplete, attempt a single follow-up to finish JSON
    const looksTruncated = providerResp.stop_reason === 'max_tokens' || (typeof contentStr === 'string' && !contentStr.trim().endsWith('}'));

    async function askForCompletion(promptText: string, maxTokens = 8000) {
      try {
        const follow = { ...providerPayloadBase, messages: [{ role: 'user', content: [{ type: 'text', text: promptText }] }], max_tokens: maxTokens };
        const followResp = await callAnthropic(follow, 45000);
        return followResp?.text ?? '';
      } catch (e) {
        console.warn('Follow-up failed', e);
        return '';
      }
    }

    if (looksTruncated) {
      console.warn('Provider response appears truncated; asking for completion.');

      // 1) Try a normal completion first (original behaviour)
      const continuationPrompt = [
        'The previous response was truncated. Complete the partial JSON to form a valid object that follows the schema EXACTLY. Return ONLY the completed JSON object.',
        '',
        'Partial JSON:',
        contentStr,
      ].join('\n');

      const followText = await askForCompletion(continuationPrompt);
      if (followText) {
        const parsedFollow = tryParseRobust(followText);
        if (parsedFollow) {
          contentStr = JSON.stringify(parsedFollow);
        } else {
          contentStr = contentStr + '\n' + followText;
        }
      }

      // 2) If still appears incomplete and the partial contains a "nodes" array, explicitly request the remaining nodes
      const parsedTry = tryParseRobust(contentStr);
      const hasNodesArrayMarker = typeof contentStr === 'string' && /"nodes"\s*:\s*\[/.test(contentStr);
      const nodesSoFar = parsedTry && Array.isArray(parsedTry.nodes) ? parsedTry.nodes.length : 0;

      if ((tryParseRobust(contentStr) == null || nodesSoFar <= 1) && hasNodesArrayMarker) {
        console.warn('Attempting targeted follow-up: request remaining nodes array items only.');
        const nodesContinuationPrompt = [
          'The previous JSON output was truncated while emitting the "nodes" array. Return ONLY the remaining items of the "nodes" array as a JSON array (e.g. [{...},{...}]) with no surrounding text or markdown. Do not return the full workflow object — only the missing nodes array items.',
          '',
          'Partial JSON (truncated):',
          contentStr,
        ].join('\n');

        const nodesText = await askForCompletion(nodesContinuationPrompt, 8000);
        const parsedNodes = tryParseRobust(nodesText) ?? (Array.isArray(tryParseRobust(nodesText)) ? tryParseRobust(nodesText) : null);

        if (Array.isArray(parsedNodes) && parsedNodes.length > 0) {
          // merge into existing parsed object (if any) or create object wrapper
          let base = tryParseRobust(contentStr) ?? {};
          base.nodes = (base.nodes || []).concat(parsedNodes);
          contentStr = JSON.stringify(base);
        }
      }

      // 3) If nodes are now present but edges are missing, ask for edges-only similarly
      const parsedAfterNodes = tryParseRobust(contentStr) ?? {};
      const edgesSoFar = Array.isArray(parsedAfterNodes.edges) ? parsedAfterNodes.edges.length : 0;
      const hasEdgesMarker = typeof contentStr === 'string' && /"edges"\s*:\s*\[/.test(contentStr);

      if ((tryParseRobust(contentStr) == null || edgesSoFar === 0) && hasEdgesMarker) {
        console.warn('Attempting targeted follow-up: request remaining edges array items only.');
        const edgesContinuationPrompt = [
          'The previous JSON output was truncated while emitting the "edges" array. Return ONLY the remaining items of the "edges" array as a JSON array (e.g. [{...},{...}]) with no surrounding text or markdown.',
          '',
          'Partial JSON (truncated):',
          contentStr,
        ].join('\n');

        const edgesText = await askForCompletion(edgesContinuationPrompt, 8000);
        const parsedEdges = tryParseRobust(edgesText) ?? (Array.isArray(tryParseRobust(edgesText)) ? tryParseRobust(edgesText) : null);
        if (Array.isArray(parsedEdges) && parsedEdges.length > 0) {
          let base = tryParseRobust(contentStr) ?? {};
          base.edges = (base.edges || []).concat(parsedEdges);
          contentStr = JSON.stringify(base);
        }
      }

      // 4) If still incomplete, request chunked output (explicit begin/end chunk markers), reassemble and parse
      const finalParsed = tryParseRobust(contentStr);
      if (!finalParsed || ((finalParsed.nodes ?? []).length <= 1 && hasNodesArrayMarker)) {
        console.warn('Attempting chunked follow-up to retrieve full JSON in labeled pieces.');

        const chunkPrompt = [
          'The previous JSON output from the API was truncated. Return the COMPLETE JSON object that follows the schema EXACTLY, but split it into sequential chunks so each chunk is small enough to not be truncated.',
          '',
          'Instructions:',
          '- Return only chunk blocks, no extra explanation or surrounding text.',
          '- Use EXACT markers around each chunk in this format:',
          "  --BEGIN CHUNK n/m--",
          '  <raw JSON text for chunk n>',
          "  --END CHUNK n/m--",
          '- n is the 1-based chunk index, m is the total number of chunks.',
          '- All chunks concatenated in order must produce the full JSON object (no commas or separators added between chunks).',
          '- Prefer chunk sizes ~3000 characters or less.',
          '',
          'Partial JSON (truncated):',
          contentStr,
          '',
          'Return the chunks now.',
        ].join('\n');

        const chunksText = await askForCompletion(chunkPrompt, 8000);
        if (chunksText) {
          // try to extract markers like --BEGIN CHUNK 1/5-- ... --END CHUNK 1/5--
          const chunkRegex = /--BEGIN CHUNK (\d+)\/(\d+)--\s*([\s\S]*?)\s*--END CHUNK \1\/\2--/g;
          const altRegex = /<<<CHUNK\s+(\d+)\/(\d+)>>>\s*([\s\S]*?)\s*<<<END CHUNK\s+\1\/\2>>>/g;
          const collected: Record<number, string> = {};
          let totalChunks = 0;
          let m: RegExpExecArray | null;
          while ((m = chunkRegex.exec(chunksText)) !== null) {
            const idx = Number(m[1]);
            totalChunks = Number(m[2]);
            collected[idx] = m[3];
          }
          if (Object.keys(collected).length === 0) {
            // try alt markers
            while ((m = altRegex.exec(chunksText)) !== null) {
              const idx = Number(m[1]);
              totalChunks = Number(m[2]);
              collected[idx] = m[3];
            }
          }

          if (totalChunks > 0 && Object.keys(collected).length === totalChunks) {
            let assembled = '';
            for (let i = 1; i <= totalChunks; i++) {
              assembled += collected[i] ?? '';
            }
            // strip markdown fences if present then try parse
            const tryParsed = tryParseRobust(assembled) ?? tryParseRobust(stripFences(assembled));
            if (tryParsed) {
              contentStr = JSON.stringify(tryParsed);
            } else {
              // if assembly didn't parse, fallback to concatenating raw chunk bodies and hope
              contentStr = assembled;
            }
          } else {
            // fallback: if chunksText looks like it contains only JSON fragments without markers, append
            contentStr = contentStr + '\n' + chunksText;
          }
        }
      }
    }

    if (!contentStr) return NextResponse.json({ error: 'No content from provider' }, { status: 502 });

    // helper: extract JSON objects inside a truncated array for a given key ("nodes" or "edges")
    function extractArrayItemsFromText(key: string, text: string): any[] {
      const idx = text.search(new RegExp(`"${key}"\\s*:\\s*\\[`, 'i'));
      if (idx < 0) return [];
      const start = text.indexOf('[', idx);
      if (start < 0) return [];
      const items: any[] = [];
      let i = start + 1;
      const L = text.length;
      while (i < L) {
        // skip whitespace and commas
        while (i < L && /\s|,/.test(text[i])) i++;
        if (i >= L) break;
        if (text[i] !== '{') break; // non-object start -> stop
        let depth = 0;
        let j = i;
        for (; j < L; j++) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') depth--;
          if (depth === 0) { j++; break; }
        }
        const candidate = text.slice(i, j);
        try {
          const parsed = JSON.parse(candidate);
          items.push(parsed);
        } catch {
          // if candidate failed, try to be permissive: attempt to fix trailing commas/newlines by stripping trailing commas
          const cleaned = candidate.replace(/,\s*}$/, '}').replace(/,\s*]$/, ']');
          try {
            const parsed2 = JSON.parse(cleaned);
            items.push(parsed2);
          } catch {
            // ignore malformed candidate
          }
        }
        i = j;
        // continue scanning for more items until ']' or end
        const nextClose = text.indexOf(']', i);
        if (nextClose >= 0 && text.slice(i, nextClose).trim().length === 0) break;
      }
      return items;
    }

    // helper: simple property extractor from truncated text
    function extractStringProp(prop: string, text: string): string | null {
      const m = text.match(new RegExp(`"${prop}"\\s*:\\s*"([^"]{0,2000}?)"`, 'i'));
      return m ? m[1] : null;
    }
    function extractNumberProp(prop: string, text: string): number | null {
      const m = text.match(new RegExp(`"${prop}"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i'));
      return m ? Number(m[1]) : null;
    }

    // Extract the JSON from the provider response, handling markdown code blocks and newlines
    let workflowData: GeneratedWorkflow | null = null;
    try {
      // Prefer the permissively-extracted content (unescaped) we already built above.
      // providerResp.text may be a stringified wrapper containing escaped newlines,
      // so try robust parsing of contentStr first and fall back to extracting/parsing inner text.
      workflowData =
        tryParseRobust(contentStr) ??
        extractJsonFromProvider(contentStr) ??
        // fallback: if providerResp.text is a JSON wrapper, parse it and extract inner text
        (() => {
          try {
            const outer = typeof providerResp.text === 'string' ? JSON.parse(providerResp.text) : providerResp.text;
            const inner = extractText(outer) || (outer?.content && outer.content[0]?.text) || '';
            return tryParseRobust(String(inner)) ?? extractJsonFromProvider(String(inner));
          } catch {
            return null;
          }
        })();
      if (!workflowData) throw new Error('Could not extract workflow JSON');
    } catch (err) {
      console.error('Error extracting workflow:', err);
      workflowData = { title: 'Parse error', nodes: [], edges: [] };
    }

    // If the prompt implied branching but we only got one node, attempt up to 2 stronger follow-ups
    const branchingKeywords = /\b(yes|no|if|else|either|branch|either\/or|either or|choose)\b/i;
    const gotOneNode = (workflowData.nodes ?? []).length <= 1;
    if (gotOneNode && branchingKeywords.test(String(prompt))) {
      const MIN_NODES = 8; // adjust upward for more complex flows
      console.warn('Detected branching intent but only one node generated — requesting stronger expansion.');
      let attempts = 0;
      while (attempts < 2 && (workflowData.nodes ?? []).length < MIN_NODES) {
        attempts++;
        const expandPrompt = [
          `The original response was incomplete. You MUST return ONLY a single JSON object (no markdown) that follows the schema EXACTLY:`,
          systemInstruction,
          '',
          `Return a workflow that contains at least ${MIN_NODES} nodes (or every node from the original mermaid if provided).`,
          'Include decision nodes for branching and label edges (e.g., Yes/No) where applicable.',
          '',
          'If you cannot produce the required JSON, return {}.',
          '',
          'Original partial JSON:',
          JSON.stringify(workflowData),
          '',
          'Return ONLY the completed JSON object.',
        ].join('\n');

        try {
          const follow = { ...providerPayloadBase, messages: [{ role: 'user', content: [{ type: 'text', text: expandPrompt }] }], max_tokens: 8000 };
          const followResp = await callAnthropic(follow, 45000);
          if (followResp && followResp.text) {
            const parsed = tryParseRobust(followResp.text);
            if (parsed && parsed.nodes && parsed.nodes.length > (workflowData.nodes ?? []).length) {
              workflowData = parsed as GeneratedWorkflow;
              console.log('Expanded workflow received with', workflowData.nodes?.length, 'nodes on attempt', attempts);
              if ((workflowData.nodes ?? []).length >= MIN_NODES) break;
            } else {
              console.warn('Expansion attempt did not increase node count (attempt', attempts, ')');
            }
          }
        } catch (e) {
          console.warn('Expansion follow-up failed', e);
        }
      }
      if ((workflowData.nodes ?? []).length <= 1) {
        console.warn('Expansion attempts exhausted; proceeding with best-effort parse.');
      }
    }

    // sanitize nodes and ensure non-empty titles (final safety)
    workflowData.nodes = (workflowData.nodes ?? []).map((n, idx) => {
      const safeId = String(n.id ?? `node_${idx + 1}`);
      const safeType = (n.type as NodeType) ?? 'action';
      const rawTitle = n.title ?? '';
      const safeTitle = (String(rawTitle).trim().length > 0) ? String(rawTitle).trim() : `Untitled ${safeId}`;
      const safeX = Number(n.x) || idx * 140;
      const safeY = Number(n.y) || idx * 120;
      const safeDetails = (n.details && typeof n.details === 'object') ? { ...n.details } : {};
      safeDetails.provider_id = safeDetails.provider_id ?? n.id ?? `prov_${idx + 1}`;
      return { id: safeId, type: safeType, title: safeTitle, x: safeX, y: safeY, details: safeDetails };
    });

    workflowData.edges = (workflowData.edges ?? []).map((e, idx) => ({
      id: e.id ?? `edge_${idx + 1}`,
      from_node_id: String(e.from_node_id),
      to_node_id: String(e.to_node_id),
      label: e.label ?? undefined,
      style: e.style ?? 'solid',
    }));

    console.log('Final workflow preview:', { title: workflowData.title, nodeCount: workflowData.nodes.length, edgeCount: workflowData.edges.length });

    // insert into DB
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const versionNumber = Number(workflowData.version) || 1;
    const { data: workflowRow, error: workflowError } = await supabase.from('workflow').insert({
      title: workflowData.title ?? 'Imported workflow',
      description: workflowData.description ?? '',
      domain: workflowData.domain ?? 'Imported',
      version: versionNumber,
      status: 'draft',
    }).select().single();

    if (workflowError || !workflowRow) {
      console.error('Failed to create workflow row:', workflowError);
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
    }

    try {
      const providerIdToDbId: Record<string, number> = {};

      if (workflowData.nodes.length > 0) {
        const nodesPayload = workflowData.nodes.map((n) => ({
          workflow_id: workflowRow.id,
          title: n.title, // sanitized above so non-null
          type: n.type ?? 'action',
          x: Math.round(Number(n.x) || 0),
          y: Math.round(Number(n.y) || 0),
          details: { ...(n.details ?? {}), provider_id: (n.details && (n.details as any).provider_id) ?? n.id },
          status: 'active',
        }));

        const { data: insertedNodes, error: nodesErr } = await supabase.from('node').insert(nodesPayload).select('id, details');
        if (nodesErr) {
          console.error('Failed to insert nodes:', nodesErr);
        } else if (Array.isArray(insertedNodes)) {
          for (let i = 0; i < insertedNodes.length; i++) {
            const det = insertedNodes[i].details ?? {};
            const prov = (det && (det as any).provider_id) ?? workflowData.nodes[i]?.id;
            if (prov) providerIdToDbId[String(prov)] = insertedNodes[i].id;
          }
        }
      }

      if ((workflowData.edges ?? []).length > 0) {
        const edgesPayload = (workflowData.edges ?? [])
          .map((e) => {
            const fromDb = providerIdToDbId[String(e.from_node_id)];
            const toDb = providerIdToDbId[String(e.to_node_id)];
            if (!fromDb || !toDb) {
              console.warn('Skipping edge - missing mapping', { edge: e.id, from: e.from_node_id, to: e.to_node_id });
              return null;
            }
            return {
              workflow_id: workflowRow.id,
              from_node_id: fromDb,
              to_node_id: toDb,
              label: e.label ?? null,
              style: e.style ?? 'solid',
              metadata: {},
            };
          })
          .filter(Boolean) as Array<Record<string, any>>;

        if (edgesPayload.length > 0) {
          const { error: edgesErr } = await supabase.from('edge').insert(edgesPayload);
          if (edgesErr) console.error('Failed to insert edges:', edgesErr);
        }
      }
    } catch (dbErr) {
      console.error('Non-fatal DB error when inserting nodes/edges:', dbErr);
    }

    return NextResponse.json({ success: true, workflowId: workflowRow.id, workflow: workflowRow }, { status: 200 });
  } catch (err) {
    console.error('/api/generate-workflow: POST error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}