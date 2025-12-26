# Agentix CRM

## Overview

Agentix is a desktop-first CRM and Kanban management application designed with Apple-aesthetic glassmorphism. The application enables teams to manage client relationships, track project stories through a Kanban board, collaborate through comments, and maintain activity logs. The system emphasizes visual appeal, real-time collaboration, and streamlined workflow management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Rendering**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Client-side routing using Wouter for lightweight navigation
- Single-page application (SPA) architecture with code splitting capabilities

**UI Component System**
- Radix UI primitives for accessible, unstyled components (Dialog, Dropdown, Popover, etc.)
- shadcn/ui component library following the "New York" style variant
- Tailwind CSS v4 with custom CSS variables for theming and glassmorphic design tokens
- Custom glassmorphic styling through `macos-card`, `macos-panel`, and `macos-sidebar` classes
- Framer Motion integration through @hello-pangea/dnd for drag-and-drop interactions

**State Management & Data Fetching**
- TanStack Query (React Query v5) for server state management, caching, and optimistic updates
- Query invalidation strategy for real-time data synchronization
- Local component state using React hooks for UI-specific state
- Form state managed through React Hook Form with Zod validation

**Visual Design System**
- Apple-inspired aesthetics with glassmorphic design patterns
- Desktop-first responsive design that adapts to tablet and mobile viewports
- Inter and SF Pro Display fonts for typography
- Custom color palette using CSS custom properties for light/dark theme support
- Micro-animations and transitions for enhanced UX

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- HTTP server creation using Node's native `http` module
- RESTful API design pattern for client-server communication
- Session-based authentication with express-session

**Database Layer**
- PostgreSQL as the primary relational database
- Drizzle ORM for type-safe database queries and schema management
- Schema-first approach with migrations stored in `/migrations`
- Database connection pooling via postgres.js client

**Data Models**
- **Users**: Authentication, profile data, role-based access (admin/editor/viewer)
- **Clients**: Company information, ownership, industry, stage tracking, expectedRevenue, revenueTotal (calculated from invoices)
- **Stories**: Project tasks with Kanban status, priority, assignments, progress tracking
- **Comments**: Threaded discussions on stories with author attribution
- **Invoices**: Client invoices with label, amount, issuedOn date, file attachments (base64)
- **Activity Log**: Audit trail of system actions and changes
- **Sessions**: Server-side session storage using connect-pg-simple

**Authentication & Authorization**
- Google OAuth 2.0 via Passport.js strategy
- Session management with PostgreSQL-backed session store
- Role-based access control (RBAC) with three tiers: admin, editor, viewer
- Secure session cookies with httpOnly and secure flags in production
- Callback URL handling for Replit deployment environments

**API Architecture**
- RESTful endpoints organized by resource (clients, stories, comments, activity, invoices)
- Invoice endpoints: GET/POST /api/clients/:id/invoices, PATCH/DELETE /api/invoices/:id
- Request validation using Zod schemas
- Error handling with appropriate HTTP status codes
- CORS configuration for cross-origin requests
- Request logging middleware for debugging and monitoring

### Data Storage Solutions

**Primary Database**
- PostgreSQL for all persistent data storage
- Schema managed through Drizzle Kit migrations
- Row-level security can be implemented through database policies
- JSONB columns for flexible metadata storage (sessions, tags)

**File Storage**
- Planned support for Supabase Storage for client proposals and story attachments
- Base64 encoding for proposal files stored directly in database (current implementation)
- Signed URL generation for secure file access

**Session Storage**
- PostgreSQL-backed session store via connect-pg-simple
- Automatic session table creation and TTL management
- 7-day session expiration policy

### Authentication and Authorization

**Authentication Flow**
1. User initiates Google OAuth login via `/api/login`
2. Passport.js handles OAuth handshake with Google
3. User profile data exchanged for Google account information
4. User record created or updated in database
5. Session established and stored in PostgreSQL
6. Cookie sent to client for subsequent requests

**Authorization Model**
- Three role levels: admin (full access), editor (read/write), viewer (read-only)
- Role stored in user record and checked server-side
- Middleware protection for sensitive endpoints
- Session-based authentication for API requests

**Security Features**
- HTTPS enforcement in production
- Session secret from environment variables
- Trust proxy configuration for reverse proxy deployments
- CSRF protection through session validation

## External Dependencies

### Third-Party Services

**Google OAuth**
- Google Identity Platform for user authentication
- OAuth 2.0 client credentials (ID and secret) required
- Callback URL must be registered in Google Cloud Console
- Scopes: profile, email

**Google AI Studio (Planned)**
- Generative AI API for drafting emails from story context
- API key authentication
- Content generation based on client and story data

**Gmail API (Planned)**
- Send emails on behalf of authenticated users
- OAuth consent for Gmail send scope
- Email logging back to activity log and comments

### Database Services

**PostgreSQL**
- Version compatibility: PostgreSQL 12+
- Connection via DATABASE_URL environment variable
- Connection pooling for performance
- Support for JSONB, UUID generation, and full-text search

### Development Tools

**Replit Integration**
- Vite plugins for Replit-specific features:
  - Runtime error modal overlay
  - Cartographer for code navigation
  - Development banner
- Meta image plugin for OpenGraph image updates
- Environment-based plugin loading (dev vs production)

### NPM Packages

**Core Dependencies**
- `express` - Web server framework
- `drizzle-orm` - TypeScript ORM
- `postgres` - PostgreSQL client
- `passport` & `passport-google-oauth20` - Authentication
- `express-session` & `connect-pg-simple` - Session management
- `react` & `react-dom` - UI library
- `@tanstack/react-query` - Data fetching
- `wouter` - Client-side routing
- `zod` - Schema validation
- `@hello-pangea/dnd` - Drag and drop
- `date-fns` - Date utilities
- `recharts` - Data visualization

**UI Component Libraries**
- Comprehensive set of `@radix-ui` packages for accessible primitives
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` & `clsx` - Conditional styling
- `lucide-react` - Icon library

**Build Tools**
- `vite` - Frontend build tool
- `tsx` - TypeScript execution
- `esbuild` - Fast JavaScript bundler
- `drizzle-kit` - Database migration tool

### Environment Configuration

**Required Environment Variables**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `REPLIT_DEV_DOMAIN` or `REPL_SLUG`/`REPL_OWNER` - Deployment domain for OAuth callbacks

**Optional Environment Variables**
- `NODE_ENV` - Environment mode (development/production)
- `REPL_ID` - Replit environment identifier
- `ISSUER_URL` - Alternative OIDC issuer (for Replit Auth fallback)