# Visual Workflow Router v0.1

## Overview
Visual Workflow Router is a web application designed to create, visualize, and manage workflows. This project provides a user-friendly interface for defining workflows, including nodes and edges, and rendering them as graphs.

## Features
- Project scaffolding with a modular architecture
- Base data schema for workflows, nodes, and edges
- Design tokens for consistent styling
- Local storage management for saving and loading workflow data
- Initial graph rendering capabilities

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/visual-workflow-router-v0.1.git
   ```
2. Navigate to the project directory:
   ```
   cd visual-workflow-router-v0.1
   ```
3. Install the dependencies:
   ```
   npm install
   ```

### Running the Application
To start the development server, run:
```
npm run dev
```
The application will be available at `http://localhost:3000`.

## Project Structure
- `src/app`: Contains the main application layout and API routes.
- `src/components`: Contains reusable components for the application, including graph rendering and UI elements.
- `src/hooks`: Custom hooks for managing application state and local storage.
- `src/lib`: Utility functions and configurations for interacting with the backend and managing data.
- `src/schema`: SQL schema definitions for the database.
- `src/styles`: CSS files for design tokens and global styles.
- `db/migrations`: Database migration scripts.
- `scripts`: Utility scripts for repository setup and data seeding.
- `tasks`: Documentation for project tasks and features.
- `tests`: Unit tests for ensuring application functionality.

## Tasks
- **Repository Setup**: Follow the instructions in `tasks/01-repo-setup.md` to set up the repository.
- **Design Tokens**: Implement design tokens as described in `tasks/02-design-tokens.md`.
- **Base Data Schema**: Define the base data schema for workflows in `tasks/03-base-data-schema.md`.
- **Local Storage**: Implement local storage functionality as outlined in `tasks/04-local-storage.md`.
- **First Graph Render**: Follow the steps in `tasks/05-first-graph-render.md` to render the first graph.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.