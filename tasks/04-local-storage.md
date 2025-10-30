# Local Storage Implementation

## Overview
This document outlines the implementation of local storage for saving and loading JSON data within the application. The goal is to provide a seamless experience for users to persist their workflow data locally.

## Tasks

1. **Create a Custom Hook for Local Storage**
   - Implement a custom hook named `useLocalStorage` in `src/hooks/useLocalStorage.ts`.
   - The hook should provide methods to set, get, and remove items from local storage.
   - Ensure that the hook handles JSON serialization and deserialization.

2. **Integrate Local Storage in Components**
   - Update the `MinimalUI` component in `src/components/MinimalUI.tsx` to utilize the `useLocalStorage` hook.
   - Allow users to save their current workflow to local storage and load it back when needed.

3. **Add Save and Load Buttons**
   - In the `GraphToolbar` component (`src/components/Graph/GraphToolbar.tsx`), add buttons for saving to and loading from local storage.
   - Ensure that these buttons are styled appropriately and provide feedback to the user.

4. **Handle Edge Cases**
   - Implement error handling for scenarios where local storage is full or unavailable.
   - Provide user notifications for successful saves and loads, as well as error messages when operations fail.

5. **Testing**
   - Write unit tests for the `useLocalStorage` hook to ensure it behaves as expected.
   - Test the integration of local storage in the `MinimalUI` and `GraphToolbar` components to verify that data is saved and loaded correctly.

## Expected Outcomes
- Users will be able to save their workflow data locally, allowing for persistence across sessions.
- The application will provide a user-friendly interface for managing local storage operations.
- The implementation will be thoroughly tested to ensure reliability and robustness.