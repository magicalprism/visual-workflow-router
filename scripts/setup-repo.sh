#!/bin/bash

# This script sets up the repository for the visual-workflow-router project.

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to print messages
function print_message {
    echo "=============================="
    echo "$1"
    echo "=============================="
}

# Update package list and install dependencies
print_message "Updating package list and installing dependencies..."
npm install

# Run database migrations
print_message "Running database migrations..."
npx supabase db push

# Seed the database with sample data
print_message "Seeding the database with sample data..."
node scripts/seed-sample-data.ts

# Print completion message
print_message "Repository setup complete!"