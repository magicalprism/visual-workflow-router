# Base Data Schema

This document outlines the base data schema for the visual workflow application, detailing the structure and relationships of workflows, nodes, and edges.

## Workflows

A workflow represents a collection of nodes and edges that define a process or flow. The schema for a workflow includes the following fields:

- **id**: Unique identifier for the workflow (UUID).
- **title**: Title of the workflow (string).
- **description**: Description of the workflow (string).
- **domain**: Domain or category of the workflow (string).
- **version**: Version number of the workflow (integer).
- **status**: Current status of the workflow (e.g., draft, published) (string).
- **created_at**: Timestamp of when the workflow was created (datetime).
- **updated_at**: Timestamp of the last update to the workflow (datetime).

## Nodes

Nodes represent individual steps or actions within a workflow. The schema for a node includes the following fields:

- **id**: Unique identifier for the node (UUID).
- **workflow_id**: Foreign key referencing the associated workflow (UUID).
- **type**: Type of the node (e.g., action, decision, exception, human, terminal) (string).
- **title**: Title of the node (string).
- **x**: X-coordinate for rendering the node in the graph (integer).
- **y**: Y-coordinate for rendering the node in the graph (integer).
- **details**: Additional details or metadata associated with the node (JSON object).
- **status**: Current status of the node (e.g., active, inactive) (string).
- **created_at**: Timestamp of when the node was created (datetime).
- **updated_at**: Timestamp of the last update to the node (datetime).

## Edges

Edges represent the connections between nodes, defining the flow of the workflow. The schema for an edge includes the following fields:

- **id**: Unique identifier for the edge (UUID).
- **workflow_id**: Foreign key referencing the associated workflow (UUID).
- **from_node_id**: Foreign key referencing the starting node (UUID).
- **to_node_id**: Foreign key referencing the ending node (UUID).
- **label**: Label for the edge (e.g., Yes/No) (string).
- **style**: Style of the edge (e.g., solid, dashed) (string).
- **metadata**: Additional metadata associated with the edge (JSON object).
- **created_at**: Timestamp of when the edge was created (datetime).
- **updated_at**: Timestamp of the last update to the edge (datetime).

## Relationships

- Each workflow can have multiple nodes and edges associated with it.
- Each node can connect to multiple edges, and each edge connects two nodes.

This schema serves as the foundation for the application's data structure, ensuring consistency and integrity across workflows, nodes, and edges.