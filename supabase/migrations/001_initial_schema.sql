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
