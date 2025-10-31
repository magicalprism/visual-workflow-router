CREATE TABLE workflow (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(255),
    version INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE node (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflow(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    details JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edge (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflow(id) ON DELETE CASCADE,
    from_node_id INTEGER REFERENCES node(id) ON DELETE CASCADE,
    to_node_id INTEGER REFERENCES node(id) ON DELETE CASCADE,
    label VARCHAR(255),
    style VARCHAR(50) DEFAULT 'solid',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core workflow tables
CREATE TABLE workflow (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  domain TEXT,
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  author_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  parent_id INTEGER REFERENCES workflow(id)
);

CREATE TABLE node (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflow(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  x INTEGER DEFAULT 0,
  y INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  author_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE edge (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflow(id) ON DELETE CASCADE,
  from_node_id INTEGER REFERENCES node(id) ON DELETE CASCADE,
  to_node_id INTEGER REFERENCES node(id) ON DELETE CASCADE,
  label TEXT,
  style TEXT DEFAULT 'solid',
  metadata JSONB DEFAULT '{}',
  author_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tag (
  id SERIAL PRIMARY KEY,
  title TEXT UNIQUE NOT NULL
);

CREATE TABLE workflow_tag (
  workflow_id INTEGER REFERENCES workflow(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (workflow_id, tag_id)
);

CREATE TABLE node_tag (
  node_id INTEGER REFERENCES node(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (node_id, tag_id)
);

CREATE TABLE run (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflow(id),
  input JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT,
  metrics JSONB DEFAULT '{}'
);

CREATE TABLE run_event (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES run(id) ON DELETE CASCADE,
  node_id INTEGER REFERENCES node(id),
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_status ON workflow(status);
CREATE INDEX idx_workflow_domain ON workflow(domain);
CREATE INDEX idx_node_workflow ON node(workflow_id);
CREATE INDEX idx_edge_workflow ON edge(workflow_id);
CREATE INDEX idx_run_workflow ON run(workflow_id);
CREATE INDEX idx_run_event_run ON run_event(run_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflow_updated_at
  BEFORE UPDATE ON workflow
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_node_updated_at
  BEFORE UPDATE ON node
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample data
INSERT INTO workflow (title, description, domain, status, version)
VALUES 
  ('Florist Routing', 'Route customer orders to appropriate fulfillment centers', 'routing', 'active', 1),
  ('Customer Onboarding', 'New customer registration and verification workflow', 'onboarding', 'active', 1),
  ('Order Processing', 'End-to-end order processing and fulfillment', 'orders', 'draft', 1);

INSERT INTO node (workflow_id, title, type, x, y, details)
VALUES 
  (1, 'Start', 'action', 100, 100, '{"summary": "Order received"}'),
  (1, 'Check Zip Code', 'decision', 300, 100, '{"summary": "Validate delivery area"}'),
  (1, 'Route to DC', 'action', 500, 100, '{"summary": "Assign to distribution center"}'),
  (1, 'End', 'terminal', 700, 100, '{"summary": "Order routed"}');

INSERT INTO edge (workflow_id, from_node_id, to_node_id, label, style)
VALUES 
  (1, 1, 2, 'order', 'solid'),
  (1, 2, 3, 'valid', 'solid'),
  (1, 3, 4, 'assigned', 'solid');


-- === Errors (node-scoped, lives under a workflow) ===
create table if not exists public.error (
  id               serial primary key,
  workflow_id      integer not null references public.workflow(id) on delete cascade,
  node_id          integer references public.node(id) on delete set null,
  description      text not null,
  is_fixed         boolean not null default false,
  solution         text,
  solver_contact_id integer,
  reported_at      timestamptz default now(),
  fixed_at         timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists error_workflow_idx on public.error(workflow_id);
create index if not exists error_node_idx on public.error(node_id);
create index if not exists error_fixed_idx on public.error(is_fixed);

-- auto-updated updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_error_touch on public.error;
create trigger trg_error_touch before update on public.error
for each row execute function public.touch_updated_at();

-- convenience: set fixed_at when is_fixed flips true
create or replace function public.error_fix_bookkeeping() returns trigger
language plpgsql as $$
begin
  if (new.is_fixed = true and (old.is_fixed is distinct from true)) then
    new.fixed_at := coalesce(new.fixed_at, now());
  end if;
  return new;
end $$;

drop trigger if exists trg_error_fix_bookkeeping on public.error;
create trigger trg_error_fix_bookkeeping before update on public.error
for each row execute function public.error_fix_bookkeeping();

-- === Problems (workflow-level, across nodes) ===
create table if not exists public.problem (
  id                serial primary key,
  workflow_id       integer not null references public.workflow(id) on delete cascade,
  description       text not null,
  is_solved         boolean not null default false,
  solution          text,
  owner_contact_id  integer,
  reported_at       timestamptz default now(),
  solved_at         timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists problem_workflow_idx on public.problem(workflow_id);
create index if not exists problem_solved_idx on public.problem(is_solved);

drop trigger if exists trg_problem_touch on public.problem;
create trigger trg_problem_touch before update on public.problem
for each row execute function public.touch_updated_at();

create or replace function public.problem_solve_bookkeeping() returns trigger
language plpgsql as $$
begin
  if (new.is_solved = true and (old.is_solved is distinct from true)) then
    new.solved_at := coalesce(new.solved_at, now());
  end if;
  return new;
end $$;

drop trigger if exists trg_problem_solve_bookkeeping on public.problem;
create trigger trg_problem_solve_bookkeeping before update on public.problem
for each row execute function public.problem_solve_bookkeeping();
