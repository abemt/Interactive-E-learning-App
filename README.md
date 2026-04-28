# Interactive E-Learning App

Interactive E-Learning App is a Docker-ready, role-based K-12 learning platform with a React frontend, an Express/Sequelize backend, and gamified student progress tracking. The current codebase includes student, teacher, parent, and admin entry points; quiz flows; content management; and foundational literacy/numeracy practice for younger learners.

## What’s Included

- Student, teacher, parent, and admin role routing.
- Quiz engine and quiz results flow with XP/progress support.
- Student dashboard with quick practice for Fidel and numeracy for Grades 1 and 2.
- Immersive lesson viewer with themed backgrounds.
- Backend APIs for auth, content, quizzes, gamification, and admin workflows.
- MySQL migrations and Docker Compose orchestration.

## Tech Stack

### Backend

- Node.js
- Express.js
- Sequelize
- MySQL
- JWT authentication
- Multer file uploads

### Frontend

- React
- Vite
- Tailwind CSS
- React Router

### DevOps

- Docker
- Docker Compose
- Sequelize migrations

## Repository Layout

```text
backend/
  src/
    Controllers/
    Middleware/
    Routes/
    Services/
    config/
    database/
    models/
    app.js
    server.js
frontend/
  src/
    components/
    services/
    App.jsx
    main.jsx
    index.css
  public/
docker-compose.yml
README.md
```

## Key Features

### Student Experience

- Personalized dashboard with progress, XP, level, badges, and leaderboard context.
- Quick Practice entry points for Fidel and numeracy on Grades 1 and 2.
- Fidel learning grid with pronunciation playback and fallback speech synthesis.
- Numeracy grid for numbers 1-20 with Amharic and English labels.
- Quiz completion flow that leads into a dedicated results/feedback screen.

### Teacher Experience

- Create and manage content modules.
- Build quizzes and learning content.
- View class analytics and content progress.
- Use themed immersive lesson content.

### Parent and Admin Experience

- Parent dashboard for learner progress visibility.
- Admin tooling for user and content administration.
- Bulk upload support in the backend.

### Gamification

- XP awards for quiz completion and performance.
- Progress tracking by module.
- Auto-generated levels and badges for modules.
- Leaderboard and badge retrieval endpoints.

## Getting Started

### Prerequisites

- Docker Desktop
- Docker Compose
- Node.js 20+ if you want to run frontend/backend outside Docker
- MySQL 8+ if you are not using the containerized database

### Run With Docker

1. Start the stack.

```bash
docker compose up -d
```

2. Run migrations in the backend container.

```bash
docker compose exec backend npm run migrate
```

3. Open the app.

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MySQL: localhost:3306

### Local Development

If you run the services separately, start the backend and frontend from their respective directories after installing dependencies.

## Common Scripts

These scripts may vary slightly depending on the package.json in each workspace folder.

- Backend migrations: `npm run migrate`
- Frontend dev server: `npm run dev`
- Frontend lint: `npm run lint`

## API Surface

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Content

- `GET /api/content/student/learning-path`
- `GET /api/content/student/lessons/:lessonId`
- `POST /api/content/modules`
- `POST /api/content/items`

### Quiz

- `GET /api/quiz/render/:quizId`
- `POST /api/quiz/answer`
- `GET /api/quiz/results/:quizId`

### Gamification

- `POST /api/gamification/award-xp`
- `POST /api/gamification/generate-course`
- `GET /api/gamification/progress/:moduleId`
- `GET /api/gamification/leaderboard/:moduleId`
- `GET /api/gamification/my-badges`

### Admin

- Content import and user administration routes are available under `/api/admin`.

## Notes on Current UI Behavior

- Quick Practice is currently gated to Grades 1 and 2.
- Fidel and numeracy pronunciation use browser fallback speech when audio files are missing.
- Quiz results are rendered in an opaque high-contrast shell to avoid immersive lesson backgrounds bleeding through.

## Troubleshooting

- If backend behavior looks stale after changing controllers, restart the backend container.
- On Windows, use `npm.cmd exec -- eslint ...` for targeted lint runs if PowerShell blocks `npx.ps1`.
- If a quiz or lesson view looks visually wrong, check whether an immersive theme class is still being applied at the parent level.

## License

MIT unless otherwise noted in the repository.
    "role": "Student"
  }
}
```

### Content Management Endpoints

#### Create Module (Auto-Gamification)
```http
POST /api/content/modules
Authorization: Bearer <token>
Content-Type: application/json

{
  "classId": 1,
  "title": "JavaScript Fundamentals",
  "description": "Learn the basics of JavaScript",
  "autoGenerateGamification": true,
  "totalQuestions": 15
}
```

#### Get Modules by Class
```http
GET /api/content/modules/class/:classId
Authorization: Bearer <token>
```

#### Create Content Item
```http
POST /api/content/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "moduleId": 1,
  "title": "Variables Quiz",
  "itemType": "Quiz",
  "contentBody": "Quiz content here",
  "sequenceOrder": 1
}
```

### Gamification Endpoints

#### Award XP
```http
POST /api/gamification/award-xp
Authorization: Bearer <token>
Content-Type: application/json

{
  "moduleId": 1,
  "contentItemId": 5,
  "score": 95,
  "totalQuestions": 10,
  "reason": "Quiz Completion"
}
```

**Response:**
```json
{
  "success": true,
  "xpAwarded": 120,
  "totalXP": 370,
  "currentLevel": 3,
  "leveledUp": true,
  "newLevel": 3,
  "nextLevelXP": 500,
  "badgesEarned": [
    {
      "id": 5,
      "title": "JavaScript Fundamentals - Master",
      "xpReward": 300
    }
  ],
  "completionPercentage": 60.00
}
```

#### Get User Progress
```http
GET /api/gamification/progress/:moduleId
Authorization: Bearer <token>
```

#### Get Leaderboard
```http
GET /api/gamification/leaderboard/:moduleId?limit=10
Authorization: Bearer <token>
```

#### Get My Badges
```http
GET /api/gamification/my-badges
Authorization: Bearer <token>
```

For complete API documentation, see [GAMIFICATION_GUIDE.md](backend/GAMIFICATION_GUIDE.md)

## 🎮 Gamification System

### XP Calculation Formula

```javascript
Base XP = (totalQuestions × 10) × (score / 100)

Bonuses:
- Perfect Score (100%): +50 XP
- High Score (90-99%): +25 XP

Total XP = Base XP + Bonuses
```

### Level Progression

| Level | Title        | XP Required |
|-------|--------------|-------------|
| 1     | Novice       | 0           |
| 2     | Learner      | 100         |
| 3     | Apprentice   | 250         |
| 4     | Practitioner | 500         |
| 5     | Expert       | 1000        |
| 6     | Master       | 2000        |

### Badge Types

1. **Completion Badge** (200 XP)
   - Awarded for completing 100% of module content

2. **Mastery Badge** (300 XP)
   - Awarded for achieving 95%+ scores

3. **Perfectionist Badge** (150 XP)
   - Awarded for perfect 100% scores

### Auto-Generation

When a teacher creates a new module:
- ✅ Level definitions automatically created
- ✅ Badge templates auto-generated
- ✅ XP thresholds configured
- ✅ Progress tracking initialized

## 💻 Development

### Local Development (Without Docker)

1. **Start MySQL Database**
   ```bash
   mysql -u root -p
   CREATE DATABASE elearning;
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   echo "DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=elearning
   DB_USER=root
   DB_PASSWORD=yourpassword
   JWT_SECRET=your_secret_key
   JWT_EXPIRES_IN=12h
   PORT=5000" > .env
   
   # Run migrations
   npm run migrate
   
   # Start server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Running Migrations

```bash
# Using Docker
docker-compose exec backend npm run migrate

# Local development
cd backend
npm run migrate
```

### Testing the System

See [SETUP_GAMIFICATION.md](backend/SETUP_GAMIFICATION.md) for detailed testing instructions.

### Environment Variables

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=12h

DB_HOST=db
DB_PORT=3306
DB_NAME=elearning
DB_USER=elearning_user
DB_PASSWORD=elearning_password
```

## 🎨 UI/UX Design System

### Color Palette

**Primary Colors:**
- Blue: `#2196F3` (Primary actions, links)
- Yellow: `#FFEB3B` (Highlights, success states)
- Green: `#4CAF50` (Success messages, completion)

**Semantic Colors:**
- Danger: `#F44336`
- Warning: `#FF9800`
- Info: `#03A9F4`

### Typography

**Font Family:** Nunito
- Weights: 300, 400, 500, 600, 700, 800, 900
- All text uses Nunito by default
- WCAG AA compliant contrast ratios

### Component Classes

```css
/* Buttons */
.btn-primary     /* Primary blue button */
.btn-secondary   /* Yellow button */
.btn-success     /* Green button */
.btn-outline     /* Outlined button */
.btn-ghost       /* Transparent button */

/* Cards */
.card            /* White card with shadow */

/* Badges */
.badge-primary   /* Blue badge */
.badge-success   /* Green badge */
.badge-warning   /* Orange badge */

/* Alerts */
.alert-info      /* Info message */
.alert-success   /* Success message */
.alert-warning   /* Warning message */
.alert-danger    /* Error message */
```

## 🚀 Deployment

### Production Deployment with Docker

1. **Update docker-compose.yml for production**
   ```yaml
   environment:
     NODE_ENV: production
     JWT_SECRET: <strong-random-secret>
   ```

2. **Build and deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. **Run migrations**
   ```bash
   docker-compose exec backend npm run migrate
   ```

### Security Checklist

- [ ] Change default database passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable input validation
- [ ] Configure CSP headers
- [ ] Regular security updates

## 📝 Sprint Progress

### ✅ Sprint 0: Foundation (Complete)
- Docker environment setup
- Backend structure (MVC pattern)
- Frontend scaffolding with Vite + React
- Tailwind CSS with custom design tokens
- Nunito font integration
- WCAG AA compliant color system

### ✅ Sprint 1: Authentication (Complete)
- User registration with role-based access (Admin, Teacher, Student, Parent)
- User login with JWT authentication
- Password hashing with bcryptjs (10 salt rounds)
- Token expiration management (12h default)
- Bulk content upload (Excel/CSV parser)
- Role validation and error handling

### ✅ Sprint 2: Gamification Engine (Complete)
- **Task 2.1:** XP calculation and awarding system
  - Dynamic formula: `(questions × 10) × (score/100)` + bonuses
  - Perfect score bonus: +50 XP
  - High score bonus: +25 XP (90-99%)
  - Automatic level-up checking
  - Progress tracking
- **Task 2.2:** Auto-gamification generation
  - Automatically creates 6 level definitions (Novice → Master)
  - Generates 3 badge types (Completion, Mastery, Perfectionist)
  - Triggers on course creation
  - Module-specific XP thresholds
- Badge awarding and tracking
- Leaderboard system
- Complete API endpoints (13+)
- Transaction logging for audit trail

**Files:** [GAMIFICATION_GUIDE.md](backend/GAMIFICATION_GUIDE.md) | [SPRINT2_VERIFICATION.md](backend/SPRINT2_VERIFICATION.md)

### ✅ Sprint 3: CMS & Teacher Dashboard UI (Complete)
- **Task 3.1:** CRUD API endpoints for ContentModules and ContentItems
  - Full Create, Read, Update, Delete operations
  - Role-based access control (Teacher/Admin)
  - Permission validation (teachers can only edit their own content)
  - Integration with gamification engine
- **Task 3.2:** File upload system with Multer
  - Support for images (JPEG, PNG, GIF, WebP)
  - Support for Amharic audio files (MP3, WAV, OGG, WebM)
  - 10MB file size limit
  - Automatic file validation and storage
  - Static file serving at `/uploads` endpoint
  - QuizQuestions and StudentAnswers database tables
- **Task 3.3:** Teacher Dashboard React UI
  - Clean, structured layout with sidebar navigation
  - Content Library table listing modules
  - Create New Quiz modal with vertical form
  - File upload zones for images and audio
  - Action buttons: Create, Edit, Delete
  - Stats dashboard with module/quiz counts
  - Tailwind CSS with custom design tokens
  - Responsive design for all screen sizes

**Components:** TeacherDashboard, ContentLibrary, CreateQuizModal, Sidebar  
**Files:** [SPRINT3_SUMMARY.md](backend/SPRINT3_SUMMARY.md)

### 🔄 Sprint 4: Student Dashboard & Quiz Interface (Next)
- Student authentication pages
- Student dashboard with XP/levels/badges
- Quiz taking interface
- Progress visualization
- Leaderboard display

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Abemt** - Initial work - [GitHub](https://github.com/abemt)

## 🙏 Acknowledgments

- Nunito font by Vernon Adams
- Tailwind CSS team
- React and Vite communities
- Express.js framework
- Sequelize ORM

## 📞 Support

For support and questions:
- 📧 Email: support@example.com
- 💬 Discord: [Join our community]
- 📖 Documentation: [backend/GAMIFICATION_GUIDE.md](backend/GAMIFICATION_GUIDE.md)
- 🐛 Issues: [GitHub Issues](https://github.com/abemt/Interactive-E-learning-App/issues)

---

**Made with ❤️ for K-12 Education**

Happy Learning! 🎓✨
#   I n t e r a c t i v e - E - l e a r n i n g - A p p 
 
 