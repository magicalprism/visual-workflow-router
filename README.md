# Visual Workflow Router

Complete workflow management application with password-protected access, Firebase hosting, Supabase database, and Cloudflare Workers API.

## 📁 Project Structure

```
visual-workflow-router/
├── src/
│   ├── app/
│   │   ├── pass/page.tsx          # Password gate
│   │   ├── workflows/page.tsx     # Workflow library
│   │   ├── api/pass/route.ts      # Password verification
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   ├── api.ts                # API utilities
│   │   └── utils.ts              # Helper functions
│   ├── types/index.ts            # TypeScript types
│   ├── components/               # UI components (empty, ready for you)
│   └── middleware.ts             # Route protection
├── cloudflare-workers/
│   └── workflow-api/
│       ├── src/index.ts          # API endpoints
│       ├── wrangler.toml         # Worker config
│       ├── package.json
│       └── tsconfig.json
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema + sample data
├── public/                       # Static assets
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── firebase.json
└── .env.local.example
```

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
cd cloudflare-workers/workflow-api && npm install && cd ../..
```

### 2. Set Up Environment Variables

```bash
# Copy example file
cp .env.local.example .env.local

# Generate password hash
echo -n "YourSecurePassword" | openssl dgst -sha256 -hex
# Copy the hex output

# Edit .env.local and add:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_CF_WORKER_URL
# - ACCESS_PASSWORD_HASH (the hash you just generated)
```

### 3. Set Up Supabase Database

1. Create project at https://supabase.com
2. Go to SQL Editor
3. Paste and run `supabase/migrations/001_initial_schema.sql`
4. Verify: You should see 3 workflows in the `workflow` table
5. Copy URL and anon key to `.env.local`

### 4. Set Up Cloudflare Worker

```bash
cd cloudflare-workers/workflow-api

# Login
wrangler login

# Create KV namespace for rate limiting
wrangler kv:namespace create "KV_RATE_LIMIT"
# Copy the ID and update wrangler.toml

# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put ACCESS_PASSWORD_HASH
wrangler secret put ACCESS_COOKIE_SECRET

# Deploy
wrangler deploy

# Copy the worker URL to .env.local as NEXT_PUBLIC_CF_WORKER_URL
cd ../..
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 🔐 Password Gate

The app is protected with a password gate:
1. First visit redirects to `/pass`
2. Enter password (hash stored in `ACCESS_PASSWORD_HASH`)
3. Cookie set for 30 days
4. Access granted to all routes

**To test:** Use the password you hashed in step 2.

## 📦 Deploy to Firebase

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select hosting, set public dir to "out")
firebase init hosting

# Build and deploy
npm run build
firebase deploy
```

Your app will be live at `https://your-project.web.app`

## 🗃️ Database Schema

The migration creates these tables:
- `workflow` - Workflow metadata
- `node` - Workflow nodes (action, decision, exception, human, terminal)
- `edge` - Connections between nodes
- `tag` - Tags for categorization
- `workflow_tag` - Workflow-tag relationships
- `node_tag` - Node-tag relationships
- `run` - Simulation runs
- `run_event` - Events during runs

**Sample data included:** 3 workflows with nodes and edges.

## 🔌 API Endpoints

Your Cloudflare Worker provides:

```
GET  /health              # Health check
GET  /workflows           # List all workflows
GET  /workflows/:id       # Get single workflow
```

**To add more endpoints:** Edit `cloudflare-workers/workflow-api/src/index.ts`

## 🛠️ What to Build Next

The foundation is complete! Add these features:

### 1. Workflow Builder Canvas
```bash
# React Flow is already installed
# Create src/app/workflows/[id]/page.tsx
# - Add React Flow canvas
# - Load/save nodes and edges
# - Drag-and-drop editing
```

### 2. Node Details Drawer
```bash
# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add sheet tabs input textarea

# Create src/components/workflow/NodeDrawer.tsx
```

### 3. AI Workflow Generation
```bash
# Add to Worker: POST /ai/workflow/generate
# Use OpenAI to generate workflow from prompt
# Frontend: Modal with text input -> create workflow
```

### 4. Report Generation (DOCX/PDF)
```bash
# Add to Worker: POST /ai/workflow/report
# Generate reports using docx library
# Upload to Supabase Storage
# Return download link
```

## 🧪 Testing

```bash
# Test password API
curl -X POST http://localhost:3000/api/pass \
  -H "Content-Type: application/json" \
  -d '{"password":"test"}'

# Test Worker (after deploy)
curl https://workflow-api.your-subdomain.workers.dev/health
curl https://workflow-api.your-subdomain.workers.dev/workflows
```

## 📝 Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
NEXT_PUBLIC_CF_WORKER_URL=https://workflow-api.xxx.workers.dev
ACCESS_PASSWORD_HASH=abc123...
ACCESS_COOKIE_NAME=vwf_access

# Worker (via wrangler secret)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
ACCESS_PASSWORD_HASH
ACCESS_COOKIE_SECRET
```

## 🔒 Security Features

- ✅ SHA-256 password hashing
- ✅ Constant-time comparison
- ✅ HttpOnly cookies
- ✅ Secure cookie flags (production)
- ✅ Middleware route protection
- ✅ 30-day session expiry

## 🐛 Troubleshooting

**"Missing Supabase environment variables"**
- Check `.env.local` exists and has correct values
- Restart dev server: `npm run dev`

**Password not working**
- Regenerate hash: `echo -n "YourPassword" | openssl dgst -sha256 -hex`
- Update `.env.local`
- Clear browser cookies

**Worker not responding**
- Check deployment: `wrangler deployments list`
- View logs: `wrangler tail`
- Verify secrets: `wrangler secret list`

**Build errors**
- Clear cache: `rm -rf .next out`
- Reinstall: `rm -rf node_modules && npm install`

## 📚 Documentation

See also:
- Enhanced Specification (../enhanced-workflow-spec.md)
- Installation Checklist (../installation-checklist.md)
- Quick Reference (../quick-reference.md)

## 🎯 Features Implemented

- ✅ Password gate with 30-day session
- ✅ Workflow library with search
- ✅ Database schema with sample data
- ✅ Cloudflare Worker API
- ✅ TypeScript throughout
- ✅ Tailwind CSS styling
- ✅ Firebase hosting config
- ✅ Next.js static export

## 🎨 UI Components Ready to Add

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog input label select table tabs toast sheet dropdown-menu badge alert
```

## 📞 Support

This is a complete working foundation. All core infrastructure is ready. Build your features on top!

---

**Built with:** Next.js • React • TypeScript • Tailwind CSS • Supabase • Cloudflare Workers • Firebase
