# Visual Workflow Router

## Overview
The Visual Workflow Router is a web application designed to facilitate the creation and management of workflows through a visual interface. Users can build workflows by connecting various nodes, each representing a specific action or decision point in the process.

## Features
- **Visual Workflow Builder**: Drag-and-drop interface for creating workflows.
- **Multi-Tab Node Editor**: A comprehensive editor for configuring node properties across multiple tabs.
- **Real-time Collaboration**: Multiple users can work on the same workflow simultaneously.
- **Database Integration**: Utilizes Supabase for data storage and retrieval.
- **Accessibility Features**: Ensures that the application is usable by all individuals, including those with disabilities.

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/visual-workflow-router.git
   ```
2. Navigate to the project directory:
   ```
   cd visual-workflow-router
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Set up your Supabase project and configure the `.env` file with your Supabase credentials.

## Usage
1. Start the development server:
   ```
   npm run dev
   ```
2. Open your browser and navigate to `http://localhost:3000`.

## File Structure
```
visual-workflow-router
├── src
│   ├── app
│   │   ├── workflows
│   │   │   └── [id]
│   │   │       ├── page.tsx
│   │   │       └── NodeModal
│   │   │           ├── index.tsx
│   │   │           ├── NodeModalTabs.tsx
│   │   │           ├── tabs
│   │   │           │   ├── GeneralTab.tsx
│   │   │           │   ├── RulesTab.tsx
│   │   │           │   ├── RunbookTab.tsx
│   │   │           │   └── AdvancedTab.tsx
│   │   │           └── InfoModal.tsx
│   ├── components
│   │   ├── Modal.tsx
│   │   ├── IconButton.tsx
│   │   ├── Form
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Select.tsx
│   │   │   └── FieldLabel.tsx
│   │   └── Tabs
│   │       ├── Tabs.tsx
│   │       └── TabPanel.tsx
│   ├── lib
│   │   └── supabase.ts
│   ├── hooks
│   │   ├── useFormValidation.ts
│   │   └── useAccessibleModal.ts
│   ├── services
│   │   └── nodeService.ts
│   ├── utils
│   │   └── validators.ts
│   └── types
│       └── index.ts
├── db
│   └── migrations
│       └── 20251030_add_node_modal_fields.sql
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.