# Repository Setup Tasks

## 1. Clone the Repository
- Clone the repository from the version control system (e.g., GitHub).
- Navigate to the project directory.

## 2. Install Dependencies
- Run the following command to install the necessary dependencies:
  ```
  npm install
  ```

## 3. Configure Environment Variables
- Create a `.env` file in the root of the project.
- Add the following environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
  SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
  ANTHROPIC_API_KEY=<your_anthropic_api_key>
  ```

## 4. Set Up Database
- Run the initial migration to set up the database schema:
  ```
  npx supabase db push
  ```

## 5. Seed Sample Data
- Execute the seed script to populate the database with sample data:
  ```
  ts-node scripts/seed-sample-data.ts
  ```

## 6. Start the Development Server
- Start the development server to run the application:
  ```
  npm run dev
  ```

## 7. Verify Setup
- Open your browser and navigate to `http://localhost:3000` to verify that the application is running correctly.