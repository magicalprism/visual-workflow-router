# 🧠 Visual Workflow Router — AI Developer Guide

> **Purpose:**  
> This file tells AI coding assistants (like GitHub Copilot, VS Code AI, ChatGPT - VSCode plugin, etc.) how to behave inside this repository.  
> It defines guardrails and project context so the AI edits *existing code in place* instead of scaffolding new workspaces.

---

## 🔒 EDIT-ONLY MODE

**AI, read carefully:**

1. **Never scaffold a new project.**  
   - Do NOT run `npm create`, `vite create`, or modify workspace settings.  
   - Do NOT add, remove, or overwrite `package.json`, `.gitignore`, or build configs.

2. **Never create a new “workspace” folder.**  
   - All changes must happen inside the current repository:  
     `magicalprism/visual-workflow-router`.

3. **Only modify or create files inside `/src/`.**
   - ✅ `src/components/` — UI pieces  
   - ✅ `src/forms/`, `src/modals/`, `src/workflows/`  
   - ✅ You may create helper files in `/src/lib/` or `/src/hooks/` if referenced.  
   - 🚫 No files outside `/src` unless explicitly requested.

4. **Always enhance existing code first.**
   - If a feature already exists, edit that section (look for “ANCHOR” comments).  
   - Only create a new file if the parent file imports it.

5. **Output format:**  
   - Provide full file contents or diff-style edits.  
   - Never explain in prose; just show working code.

---

## 🧩 PROJECT STACK

| Layer | Tech |
|-------|------|
| Front-end | React 18 |
| Canvas | React Flow |
| Backend | Supabase (Postgres + JS client) |
| Styling | Basic CSS / inline styles — **no MUI or Tailwind here** |
| TypeScript | ✅ Yes |
| Build | Vite |
| Auth | Supabase (client-side) |

---

## 🗂️ CONVENTIONS

- File paths are **relative to `/src/`**.  
- Components use PascalCase (`NodeModal.tsx`, `ProblemsRepeaterField.tsx`).  
- Hooks use camelCase (`useWorkflow.ts`, `useNodes.ts`).  
- DB tables mirror Supabase schema (`workflow`, `node`, `edge`, `error`, `problem`).  
- All IDs are integer `SERIAL` PKs in Postgres.  
- All date columns are `timestamptz`.

---

## 🧱 DATABASE SNAPSHOT

### `workflow`
`id, title, description, domain, version, status, created_at, updated_at`

### `node`
`id, workflow_id, title, type, x, y, details, status, created_at, updated_at`

### `edge`
`id, workflow_id, from_node_id, to_node_id, label, style, metadata, created_at, updated_at`

### `error`
`id, workflow_id, node_id, description, is_fixed, solution, solver_contact_id, reported_at, fixed_at, created_at, updated_at`

### `problem`
`id, workflow_id, description, is_solved, solution, owner_contact_id, reported_at, solved_at, created_at, updated_at`

---

## 🧮 CURRENT FEATURES TO MODIFY

| Feature | File | Description |
|----------|------|-------------|
| Node Modal | `src/components/modals/NodeModal.tsx` | Edit existing “Errors” field to use `ErrorRepeaterField`. |
| Workflow View | `src/components/workflows/WorkflowView.tsx` | Replace “Problems” section with `ProblemsRepeaterField` (two-tab Active/Solved view). |
| ErrorRepeater | `src/components/forms/ErrorRepeaterField.tsx` | Handles node-scoped `error` table CRUD. |
| ProblemsRepeater | `src/components/forms/ProblemsRepeaterField.tsx` | Handles workflow-scoped `problem` table CRUD + tab logic. |

Look for the markers:
```tsx
// ANCHOR: ErrorsRepeaterMount
// ANCHOR: ProblemsRepeaterMount

Git: https://github.com/magicalprism/visual-workflow-router