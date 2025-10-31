import { NextResponse } from 'next/server';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!OPENAI_KEY) {
      console.error('generate-report: missing OPENAI_API_KEY');
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const payload = await req.json();

    const system = `You are an expert technical writer. Given workflow metadata, nodes and edges produce a clear, professional report suitable for stakeholders.
Output a JSON object with fields:
- executive_summary: short (3-6 sentences) high-level summary of the workflow and key risks
- key_paths: a concise description of the main/golden path(s)
- node_insights: array of { id, title, type, insight }
- recommendations: array of short recommendations (prioritized)
Return only the JSON object (no extra commentary).`;

    const user = `Here is the workflow data (JSON):\n${JSON.stringify(payload, null, 2)}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });

    const raw = await res.text();
    // server-side log for debugging
    console.log('generate-report: OpenAI response status', res.status);
    console.log('generate-report: OpenAI raw response', raw);

    if (!res.ok) {
      // try parse openai error JSON, otherwise return raw text
      let parsedErr: any = raw;
      try {
        parsedErr = JSON.parse(raw);
      } catch {
        /* keep raw */
      }
      // return the openai error body back to client with the same status code
      return NextResponse.json({ error: 'OpenAI error', details: parsedErr }, { status: res.status });
    }

    // parse successful response
    let data: any = {};
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.warn('generate-report: failed to parse OpenAI JSON, returning raw text', e);
      return NextResponse.json({ result: { raw } });
    }

    const content = data?.choices?.[0]?.message?.content ?? null;

    let parsed: any = null;
    try {
      parsed = content ? JSON.parse(content) : null;
    } catch (e) {
      parsed = { raw: content };
    }

    return NextResponse.json({ result: parsed });
  } catch (err) {
    console.error('generate-report error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}