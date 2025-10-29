interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  ACCESS_PASSWORD_HASH: string;
  ACCESS_COOKIE_SECRET: string;
  KV_RATE_LIMIT: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/workflows' && request.method === 'GET') {
        const response = await fetch(`${env.SUPABASE_URL}/rest/v1/workflow?select=*&order=updated_at.desc`, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });

        const data = await response.json();
        return new Response(JSON.stringify({ items: data, page: 1, total: data.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.match(/^\/workflows\/\d+$/) && request.method === 'GET') {
        const id = url.pathname.split('/')[2];
        
        const response = await fetch(`${env.SUPABASE_URL}/rest/v1/workflow?id=eq.${id}`, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });

        const data = await response.json();
        return new Response(JSON.stringify(data[0]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
