import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { error, data } = await supabase
      .from('workflow')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: 'Failed to delete workflow', detail: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: data }, { status: 200 });
  } catch (err) {
    console.error('Unexpected delete error:', err);
    return NextResponse.json({ error: 'Unknown server error' }, { status: 500 });
  }
}