# 🎓 Interactive E-Learning Platform

A comprehensive, gamified e-learning platform designed for K-12 education with role-based access for Students, Teachers, Parents, and Admins. Built with modern technologies and Docker for easy deployment.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![React](https://img.shields.io/badge/react-19.2-blue.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0-orange.svg)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Gamification System](#gamification-system)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

### 🎮 Gamification Engine (Sprint 2)
- **Automatic XP System**: Dynamic experience point calculation based on quiz scores
- **Progressive Leveling**: 6-tier level system (Novice → Master)
- **Achievement Badges**: Auto-generated badges for course completion, mastery, and perfect scores
- **Leaderboards**: Competitive rankings per module
- **Progress Tracking**: Real-time completion percentage and activity tracking

### 👥 Role-Based Access Control
- **Students**: Complete courses, earn XP, collect badges, track progress
- **Teachers**: Create courses with auto-gamification, manage content, view analytics
- **Parents**: Monitor child's progress and achievements
- **Admins**: System management, bulk uploads, user administration

### 📚 Content Management
- **Module System**: Organize courses into structured learning paths
- **Content Types**: Support for Videos, Articles, Quizzes, and Assignments
- **Bulk Upload**: Excel/CSV import for quick content creation
- **Sequenced Learning**: Ordered content delivery for structured learning

### 🎨 Modern UI/UX
- **Child-Centric Design**: Vibrant color palette (Blue, Yellow, Green)
- **Responsive Layout**: Mobile-first design with fluid grids
- **WCAG AA Compliant**: Accessible for all learners
- **Nunito Font**: Clean, friendly typography

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Password Hashing**: bcryptjs

### Frontend
- **Framework**: React 19.2
- **Build Tool**: Vite 8.x
- **Styling**: Tailwind CSS 3.4
- **State Management**: React Hooks
- **HTTP Client**: Fetch API / Axios

### DevOps
- **Containerization**: Docker & Docker Compose
- **Database Migrations**: Sequelize CLI
- **Development**: Hot-reload for both frontend and backend
- **Logging**: Morgan (HTTP request logger)

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   MySQL     │  │   Backend   │  │  Frontend   │     │
│  │   Port:     │◄─┤   Port:     │◄─┤   Port:     │     │
│  │   3306      │  │   5000      │  │   3000      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                 │                 │            │
│         │                 │                 │            │
│    [Persistent        [Hot          [Hot Reload]        │
│     Volume]          Reload]                             │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

**Core Tables:**
- `Users` - User authentication and profiles
- `Classes` - Course classes/groups
- `ContentModules` - Course modules
- `ContentItems` - Individual learning content
- `ScoreLogs` - Quiz/assignment scores

**Gamification Tables:**
- `UserProgress` - XP, levels, completion tracking
- `XPTransactions` - XP earning logs
- `LevelDefinitions` - Level thresholds per module
- `BadgeDefinitions` - Badge templates
- `Badges` - User badge awards

## 🚀 Getting Started

### Prerequisites

- **Docker Desktop** installed and running
- **Git** for version control
- **Node.js 20.x** (optional, for local development)
- **MySQL 8.0** (optional, for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abemt/Interactive-E-learning-App.git
   cd Interactive-E-learning-App
   ```

2. **Start all services with Docker**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec backend npm run migrate
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:3306

### Quick Start Guide

#### For Teachers:

1. **Login** with teacher credentials
2. **Create a Course Module**
   ```http
   POST /api/content/modules
   {
     "classId": 1,
     "title": "Introduction to Math",
     "autoGenerateGamification": true
   }
   ```
3. **Add Content Items** (quizzes, videos, articles)
4. **System automatically generates**:
   - 6 level definitions
   - 3 achievement badges
   - XP thresholds

#### For Students:

1. **Login** with student credentials
2. **Browse available courses**
3. **Complete quizzes** to earn XP
4. **Level up** and **earn badges**
5. **Track progress** on dashboard
6. **Compete** on leaderboards

## 📁 Project Structure

```
Interactive-E-learning-App/
├── backend/
│   ├── src/
│   │   ├── Controllers/
│   │   │   ├── authController.js
│   │   │   ├── adminController.js
│   │   │   ├── contentController.js
│   │   │   └── gamificationController.js
│   │   ├── Services/
│   │   │   ├── authService.js
│   │   │   ├── gpeService.js           # Gamification engine
│   │   │   └── bulkUploadService.js
│   │   ├── Models/
│   │   │   └── index.js                # Sequelize models
│   │   ├── Routes/
│   │   │   ├── authRoute.js
│   │   │   ├── contentRoute.js
│   │   │   └── gamificationRoute.js
│   │   ├── Middleware/
│   │   │   └── authMiddleware.js
│   │   ├── database/
│   │   │   ├── migrate.js
│   │   │   └── migrations/
│   │   │       ├── 20260309-001-create-core-tables.js
│   │   │       └── 20260309-002-create-gamification-tables.js
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── app.js
│   │   └── server.js
│   ├── Dockerfile
│   ├── package.json
│   ├── GAMIFICATION_GUIDE.md
│   ├── SETUP_GAMIFICATION.md
│   └── SPRINT2_SUMMARY.md
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
├── docker-compose.yml
└── README.md
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "Student"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@example.com",
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
#   I n t e r a c t i v e - E - l e a r n i n g - A p p  
 