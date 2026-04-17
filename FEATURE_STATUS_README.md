# Feature Status README

Last verified: 2026-03-31
Branch: main

This file is a reality-check of what the system can do now (based on code currently in the repo), what is partially done, and what is still missing.

## 1) What is implemented now

### Backend API and data layer

- Express app with route groups mounted:
	- /api/health
	- /api/auth
	- /api/admin
	- /api/content
	- /api/gamification
	- /api/quiz
- MySQL + Sequelize models are defined for:
	- Users, Classes, ContentModules, ContentItems
	- ScoreLogs, Badges
	- UserProgress, XPTransactions, LevelDefinitions, BadgeDefinitions
	- QuizQuestions, StudentAnswers
- JWT auth service exists:
	- Registration with bcrypt password hashing
	- Login with JWT generation
- Core CMS endpoints exist in controllers/routes:
	- Create/read/update/delete modules
	- Create/read/update/delete content items
- Gamification endpoints exist:
	- Award XP
	- Generate module gamification
	- Get progress, leaderboard, badges, level checks
- Quiz endpoints exist:
	- CRUD for quiz questions
	- Student answer submission and quiz result retrieval
	- File upload support (image/audio) through Multer middleware
- Admin bulk upload route exists for content imports.

### Frontend routing and views

- React app routing exists for:
	- /login, /register
	- /student/dashboard, /student/fidel, /student/games/science, /student/games/math
	- /teacher/dashboard, /teacher/analytics
	- /parent/dashboard (placeholder)
- ProtectedRoute wrapper exists and enforces role-based route access on the client.
- Student dashboard UI and teacher dashboard UI are implemented visually.
- Additional student interactive components exist:
	- Fidel chart
	- Science drag-and-drop template
	- Math falling blocks game

### Dev and deployment setup

- docker-compose.yml exists with db (MySQL), backend, and frontend services.
- Backend and frontend Dockerfiles exist.
- Migrations are present for core, gamification, and quiz tables.

## 2) Partially implemented (code exists, but not fully integrated)

- Login/register frontend pages are mostly mock-driven:
	- Login currently simulates auth and stores a mock user in localStorage.
	- Backend auth API is not yet wired as the default frontend flow.
- Teacher dashboard links to /teacher/content, but no matching route is registered in App.jsx.
- Some teacher and parent features are marked "Coming Soon" in UI cards.
- Analytics and dashboard metrics appear to use static/demo values rather than complete live data integration.

## 3) Current blockers and inconsistencies

These are high-impact issues that can break end-to-end flow now.

1. Auth middleware name mismatch in backend routes.
	 - authMiddleware exports authenticateJWT.
	 - content/gamification/quiz routes import verifyToken, which is not exported.
	 - Result: protected route middleware can fail unless this is fixed.

2. Role format mismatch between frontend and backend.
	 - Backend uses roles: Admin, Teacher, Student, Parent.
	 - Frontend route protection checks lowercase roles: student, teacher, parent.
	 - Result: real backend user role values can fail client-side role checks unless normalized.

3. Teacher content flow is incomplete in router.
	 - Teacher dashboard points to /teacher/content.
	 - App router currently does not define /teacher/content.
	 - Result: navigation dead-end/redirect instead of content management UI.

## 4) What is missing (to be added)

### High priority (required for stable end-to-end use)

- Wire frontend auth to backend /api/auth/login and /api/auth/register.
- Store and use real JWT token in frontend API calls.
- Unify role handling (either all lowercase or all TitleCase) across backend and frontend.
- Fix middleware usage in protected backend routes (use exported authenticateJWT or export verifyToken alias).
- Add missing /teacher/content route and connect it to existing content UI.

### Medium priority (core product completeness)

- Replace static dashboard values with API-driven data for:
	- student progress/XP/badges
	- teacher analytics and class stats
- Complete parent dashboard with actual student progress visibility.
- Add consistent API client service layer in frontend for all major modules.

### Lower priority (quality, operations, and production hardening)

- Add automated tests:
	- backend unit/integration tests for auth/content/gamification/quiz
	- frontend component and route tests
- Improve security hardening:
	- stronger production secrets and env handling
	- rate limiting and validation coverage review
- Add CI pipeline checks (lint, tests, build) before merge.

## 5) Suggested implementation order

1. Fix auth middleware mismatch in backend routes.
2. Normalize role values frontend/backend.
3. Replace mock login with real API login and token handling.
4. Add /teacher/content route wiring and verify CRUD flow with backend.
5. Connect dashboard pages to live APIs.
6. Add tests and CI gates.

## 6) Quick status summary

- Backend foundations: implemented.
- Gamification and quiz APIs: implemented in code.
- Frontend UI shell: implemented.
- Frontend-backend integration: partially implemented.
- Production readiness: not yet complete.

