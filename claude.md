# Project: Adaptive Platform (BookQuest)

## Overview
An adaptive learning platform designed for immersive reading experiences, featuring offline-first capabilities, synchronization with Supabase, and integration with Google Drive for content management.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Frontend**: React 19, Tailwind CSS 4, Framer Motion
- **Database**: 
  - **Remote**: Supabase (PostgreSQL)
  - **Local**: Dexie.js (IndexedDB for offline-first support)
- **Icons**: Lucide React
- **PDF Handling**: pdfjs-dist, react-pdf
- **Visualization**: Recharts, D3-geo, React Simple Maps

## Core Features
- **Offline-First Synchronization**: Uses Dexie for local storage and background sync with Supabase via `sync-status.tsx`.
- **Immersive PDF Reader**: Custom reader component (`pdf-reader.tsx`) with progress tracking.
- **Google Drive Integration**: Import and manage books directly from Google Drive.
- **Adaptive Learning Logic**: Backend logic for recommending "what to teach next" based on student progress.
- **Analytics & Leaderboards**: Tracking student reading points and community feedback.
- **Security Middleware**: Centralized route protection via `src/proxy.ts` for Admin and Student dashboards.

## Database Schema (Supabase)
- **`users`**: Academic profiles including role (student/admin), school details, and total points.
- **`books`**: Library metadata, PDF URLs, levels, and aggregated ratings.
- **`reading_sessions`**: Logs of books read, duration, pages covered, and points earned.
- **`book_reviews`**: Student ratings (1-10) and feedback, with auto-calculating triggers for book averages.
- **`schools`**: Geographic and administrative data for localized analytics.
- **Analytics Views**: Specialized views for student progress, top-performing books, and school-level statistics.

## Key Directory Structure
- `/src/app`: Next.js App Router pages and API routes.
- `/src/components`: UI components (including `/ui` for shared primitives).
- `/src/hooks`: Custom React hooks for data fetching and state management.
- `/src/lib`: Core utility functions, Supabase client, and Dexie database schema.
- `supabase_schema.sql`: SQL definition for the remote database.

## Essential Scripts
- `npm run dev`: Starts the development server with Webpack.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint for code quality checks.

## Key Files
- `src/lib/db.ts`: IndexedDB schema and Dexie setup.
- `src/lib/supabase.ts`: Supabase client configuration.
- `src/components/sync-status.tsx`: Handles data persistence and sync logic.
- `src/app/read/[bookId]/page.tsx`: Main reader entry point.
