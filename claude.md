You are a senior software engineer.

Goals:
- Analyze architecture before coding
- Avoid unnecessary file reads
- Suggest minimal changes
- Preserve UI and functionality
- Optimize for performance and scalability

Project:
- Next.js frontend
- Supabase backend
- Railway AI optimization system

Rules:
- NEVER reread unchanged files
- Summarize before modifying
- Use diffs instead of rewriting full files

Title : thinksharp digital library
Project Overview
The project is a Progressive Web App (PWA) built for a reading platform, allowing students to read books (PDFs), earn points, and view their progress, while providing an admin dashboard for analytics and management. It has built-in offline support and data synchronization, allowing users to read books and track progress even without an internet connection.

## Tech Stack
Framework: Next.js 16.1 (App Router) with React 19.
Styling: Tailwind CSS v4, clsx, tailwind-merge, and Framer Motion for animations.
Backend & Auth: Supabase (PostgreSQL, Authentication).
Offline Data & Storage: Dexie.js (IndexedDB) for local caching, @ducanh2912/next-pwa for PWA features.
PDF Rendering: react-pdf, pdfjs-dist, and jspdf for handling document reading and creation.
Data Visualization: Recharts (for charts) and React Simple Maps (for geographic data on the admin dashboard).
External Integrations: Google Drive API (lib/google-drive.ts) likely used for fetching or storing book content.

## Core Features
- *Offline-First Synchronization*: Uses Dexie for local storage and background sync with Supabase via sync-status.tsx.
Things to be synced: number of books read by each student, points earned, leaderboard and quiz scores at the end of each book.
- *Immersive PDF Reader*: Custom reader component (pdf-reader.tsx) with progress tracking.
- *Google Drive Integration*: Import and manage books directly from Google Drive.
- *Analytics & Leaderboards*: Tracking student reading points. Top-line numbers for Total Books, Active Students, Schools Reached, and Cities Covered.
- *Security Middleware*: Centralized route protection via src/proxy.ts for Admin and Student dashboards.

## Database Schema (Supabase)
- *users*: Academic profiles including role (student/admin), school details, and total points.
- *books*: Library metadata, PDF URLs, levels, and aggregated ratings.
- *reading_sessions*: Logs of books read, duration, pages covered, and points earned.
- *book_reviews*: Student ratings (1-10) and feedback, with auto-calculating triggers for book averages.
- *schools*: Geographic and administrative data for localized analytics.
- *Analytics Views*: Specialized views for student progress, top-performing books, and school-level statistics.


##UI suggestions:

Create a frontend inspired by a gamified reading app. I need a dashboard that looks like a
library grid, a reading interface that mimics a physical book, and a leaderboard using a 3-tier
podium. Use a bright red and white color scheme with rounded corners on all containers.Every
user can select their own avatar.
1. Visual Identity & Brand Guidelines
Target Audience: Children (ages 5–12).
Color Palette: Primary Red (#D32F2F) and White, with secondary accents of Gold (for
rewards) and vibrant storybook colors (greens, blues, oranges).
Typography: Playful, rounded sans-serif fonts (e.g., Quicksand or Fredoka One) for
headings; clean, legible fonts for story text.
Art Style: 2D vector illustrations with thick outlines, friendly monster mascots, and
high-quality AI-generated storybook covers.



