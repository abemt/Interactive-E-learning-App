# Interactive E-Learning App

> A Docker-ready K-12 learning platform with role-based dashboards, quiz-driven progress, gamification, and foundational practice for Fidel and numeracy.

![Node.js](https://img.shields.io/badge/node-20.x-339933?style=flat-square)
![React](https://img.shields.io/badge/react-19.2-61dafb?style=flat-square)
![MySQL](https://img.shields.io/badge/mysql-8.0-4479a1?style=flat-square)
![Docker](https://img.shields.io/badge/docker-compose-2496ed?style=flat-square)

## Contents

- [At a Glance](#at-a-glance)
- [Features](#features)
- [Quick Start](#quick-start)
- [Useful Commands](#useful-commands)
- [API Surface](#api-surface)
- [Project Structure](#project-structure)
- [Current Notes](#current-notes)
- [Troubleshooting](#troubleshooting)

## At a Glance

| Area | Details |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express, Sequelize |
| Database | MySQL |
| Authentication | JWT |
| Deployment | Docker Compose |
| Roles | Student, Teacher, Parent, Admin |

## Features

### Students

- Progress dashboard with XP, levels, badges, and leaderboard context.
- Quick Practice for Fidel and numeracy on Grades 1 and 2.
- Fidel and numeracy playback with speech fallback when audio assets are missing.
- Quiz flow with a dedicated results and feedback screen.

### Teachers

- Create and manage content modules.
- Build quizzes and learning content.
- Review class analytics and content progress.
- Use immersive lesson themes.

### Parents and Admins

- Parent dashboard for learner progress visibility.
- Admin tools for user and content administration.
- Bulk upload support in the backend.

### Gamification

- XP awards for quiz completion and performance.
- Progress tracking by module.
- Auto-generated levels and badges for modules.
- Leaderboard and badge retrieval endpoints.

## Quick Start

1. Start the stack.

```bash
docker compose up -d
```

2. Run migrations.

```bash
docker compose exec backend npm run migrate
```

3. Open the app.

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| MySQL | localhost:3306 |

### Local Development

Run the frontend and backend separately after installing dependencies in each folder.

## Useful Commands

| Task | Command |
| --- | --- |
| Start frontend dev server | `npm run dev` |
| Run backend migrations | `npm run migrate` |
| Run frontend lint | `npm run lint` |

## API Surface

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Content | `GET /api/content/student/learning-path`, `GET /api/content/student/lessons/:lessonId`, `POST /api/content/modules`, `POST /api/content/items` |
| Quiz | `GET /api/quiz/render/:quizId`, `POST /api/quiz/answer`, `GET /api/quiz/results/:quizId` |
| Gamification | `POST /api/gamification/award-xp`, `POST /api/gamification/generate-course`, `GET /api/gamification/progress/:moduleId`, `GET /api/gamification/leaderboard/:moduleId`, `GET /api/gamification/my-badges` |
| Admin | Content and user administration routes live under `/api/admin` |

## Project Structure

<details>
<summary>Top-level layout</summary>

```text
backend/
frontend/
docker-compose.yml
README.md
```

</details>

## Current Notes

> Quick Practice is currently gated to Grades 1 and 2.
>
> Fidel and numeracy pronunciation use browser speech fallback when audio files are missing.
>
> Quiz results render in an opaque high-contrast shell so immersive lesson backgrounds do not bleed through.

## Troubleshooting

- Restart the backend container if controller changes seem stale.
- On Windows, use `npm.cmd exec -- eslint ...` if PowerShell blocks `npx.ps1`.
- If a lesson or quiz view looks wrong, check for lingering immersive theme classes on the parent container.

## License

MIT unless otherwise noted in the repository.
