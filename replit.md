# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2 for vision + chat)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── study-app/          # React + Vite study quiz app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side integration
│   └── integrations-openai-ai-react/   # OpenAI React client integration
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## App: Study Buddy

A study app for multiple-choice questions with AI-powered features:

- **Project folders**: Organize questions into named projects (e.g., "Econ 202 Midterm 2")
- **Upload images**: Take a screenshot of a multiple-choice question, upload it, and AI (GPT-5.2 with vision) parses the question text and answer choices
- **Upload PDFs**: Upload a PDF document with multiple-choice questions and an answer key; AI extracts all questions and marks correct answers automatically (uses `unpdf` for text extraction)
- **Quiz mode**: Answer questions and get instant correct/incorrect feedback
- **Filter & reset**: Filter questions by All, Unanswered, Correct, Needs Review; reset answers for filtered sets to re-study
- **AI explanations**: Request AI to explain why each answer choice is correct or incorrect
- **Deep dive**: Get structured analysis of underlying principles and concepts
- **Follow-up chat**: Multi-turn conversation with AI tutor about any question
- **Study stats**: Track total questions, accuracy percentage, and questions needing review (per-project and overall)
- **Course outline upload**: Upload a course outline (text or PDF), AI breaks it into study sections
- **Section deep dive**: Get structured analysis of principles for each outline section
- **Section follow-up chat**: Multi-turn conversation with AI tutor about any outline section

### Database Schema

- **projects**: id, name, created_at
- **questions**: id, project_id (FK → projects, cascade delete), question_text, answered, answered_correctly, created_at
- **choices**: id, question_id (FK → questions, cascade delete), label, text, is_correct
- **outline_sections**: id, project_id (FK → projects, cascade delete), title, content, order_index, created_at

### API Endpoints (under /api)

Projects:
- `GET /projects` — list all projects
- `POST /projects` — create a new project
- `GET /projects/:id` — get project with stats
- `PUT /projects/:id` — rename a project
- `DELETE /projects/:id` — delete project and all its questions
- `GET /projects/:id/questions?filter=all|correct|needs_review|unanswered` — list filtered questions
- `POST /projects/:id/reset?filter=all|correct|needs_review` — reset answers for filtered questions
- `GET /projects/:id/outline` — list outline sections
- `POST /projects/:id/outline` — upload outline (text or PDF), AI parses into sections
- `DELETE /projects/:id/outline` — delete all outline sections
- `DELETE /projects/:id/outline/:sectionId` — delete a single section
- `POST /projects/:id/outline/:sectionId/deep-explain` — deep dive into section principles
- `POST /projects/:id/outline/:sectionId/chat` — follow-up chat about a section

Questions:
- `GET /questions` — list all questions with choices
- `POST /questions` — create a question manually (optional projectId)
- `POST /questions/parse-image` — upload base64 image, AI parses it (optional projectId)
- `POST /questions/parse-pdf` — upload base64 PDF, AI extracts all questions (optional projectId)
- `GET /questions/:id` — get a single question
- `DELETE /questions/:id` — delete a question
- `POST /questions/:id/check` — check if selected answer is correct
- `POST /questions/:id/explain` — get AI explanations for all choices
- `POST /questions/:id/deep-explain` — get structured principle analysis
- `POST /questions/:id/chat` — multi-turn follow-up conversation
- `GET /questions/stats?projectId=N` — get study statistics (optional project filter)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with question management routes and AI integration.

- `pnpm --filter @workspace/api-server run dev` — run the dev server
- Body limit set to 50mb for image uploads

### `artifacts/study-app` (`@workspace/study-app`)

React + Vite frontend with warm study-desk themed UI.

- `pnpm --filter @workspace/study-app run dev` — run the dev server

### `lib/db` (`@workspace/db`)

Database layer with Drizzle ORM. Tables: projects, questions, choices.

- `pnpm --filter @workspace/db run push` — push schema to database

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec with codegen.

- `pnpm --filter @workspace/api-spec run codegen` — generate React Query hooks and Zod schemas

### `lib/integrations-openai-ai-server` (`@workspace/integrations-openai-ai-server`)

OpenAI server-side integration with pre-configured client, image generation, audio, and batch utilities.
