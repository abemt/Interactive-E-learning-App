# Gamification Engine & Auto-Generation System

## Overview
The Gamification & Progress Engine (GPE) is a comprehensive system that automatically generates and manages XP, levels, and badges for Interactive E-learning App courses.

## Features

### ✅ Task 2.1: Core Gamification Logic
- **calculateXP**: Dynamic XP calculation based on score and questions
- **checkLevelUp**: Automatic level progression tracking
- **Progress Tracking**: Real-time completion percentage calculation

### ✅ Task 2.2: Auto-Generation System
When a teacher creates a new course module, the system automatically:
- Generates 6 progressive levels (Novice → Master)
- Creates 3 badge definitions:
  - **Completion Badge**: Award for finishing all content
  - **Mastery Badge**: Award for achieving 95%+ scores
  - **Perfectionist Badge**: Award for perfect scores (100%)
- Sets up XP thresholds for level progression

## Database Schema

### New Tables Created
1. **BadgeDefinitions** - Templates for auto-generated badges
2. **UserProgress** - Tracks XP, level, and completion per user/module
3. **XPTransactions** - Logs all XP earned with metadata
4. **LevelDefinitions** - Defines XP thresholds for each level

## API Endpoints

### Gamification Endpoints (`/api/gamification`)

#### 1. Award XP to User
```http
POST /api/gamification/award-xp
Authorization: Bearer <token>
Content-Type: application/json

{
  "moduleId": 1,
  "contentItemId": 5,
  "score": 85,
  "totalQuestions": 10,
  "reason": "Quiz Completion"
}
```

**Response:**
```json
{
  "success": true,
  "xpAwarded": 110,
  "totalXP": 360,
  "currentLevel": 2,
  "leveledUp": true,
  "newLevel": 2,
  "nextLevelXP": 250,
  "badgesEarned": [],
  "completionPercentage": 45.50
}
```

#### 2. Generate Course Gamification (Auto-Generation)
```http
POST /api/gamification/generate-course
Authorization: Bearer <token>
Content-Type: application/json

{
  "moduleId": 1,
  "totalQuestions": 15
}
```

**Response:**
```json
{
  "success": true,
  "moduleId": 1,
  "moduleName": "Introduction to JavaScript",
  "generated": {
    "levelDefinitions": 6,
    "badgeDefinitions": 3,
    "totalXPRange": "0 - 2000+"
  },
  "details": {
    "levels": [
      { "level": 1, "title": "Novice", "xpThreshold": 0 },
      { "level": 2, "title": "Learner", "xpThreshold": 100 },
      { "level": 3, "title": "Apprentice", "xpThreshold": 250 },
      { "level": 4, "title": "Practitioner", "xpThreshold": 500 },
      { "level": 5, "title": "Expert", "xpThreshold": 1000 },
      { "level": 6, "title": "Master", "xpThreshold": 2000 }
    ],
    "badges": [
      { "title": "Introduction to JavaScript - Course Completion", "type": "Completion", "xpReward": 200 },
      { "title": "Introduction to JavaScript - Master", "type": "Mastery", "xpReward": 300 },
      { "title": "Introduction to JavaScript - Perfectionist", "type": "Special", "xpReward": 150 }
    ]
  }
}
```

#### 3. Get User Progress
```http
GET /api/gamification/progress/:moduleId
Authorization: Bearer <token>
```

#### 4. Get Module Leaderboard
```http
GET /api/gamification/leaderboard/:moduleId?limit=10
Authorization: Bearer <token>
```

#### 5. Get My Badges
```http
GET /api/gamification/my-badges
Authorization: Bearer <token>
```

#### 6. Get Available Badges for Module
```http
GET /api/gamification/badges/:moduleId
Authorization: Bearer <token>
```

### Content Management Endpoints (`/api/content`)

#### 1. Create Module (with Auto-Gamification)
```http
POST /api/content/modules
Authorization: Bearer <token>
Content-Type: application/json

{
  "classId": 1,
  "title": "Advanced Python Programming",
  "description": "Learn advanced Python concepts",
  "autoGenerateGamification": true,
  "totalQuestions": 20
}
```

**Response includes both module data and auto-generated gamification:**
```json
{
  "success": true,
  "message": "Module created successfully",
  "data": {
    "module": {
      "id": 5,
      "classId": 1,
      "title": "Advanced Python Programming",
      "description": "Learn advanced Python concepts",
      "createdAt": "2026-03-09T10:30:00.000Z"
    },
    "gamification": {
      "success": true,
      "moduleId": 5,
      "moduleName": "Advanced Python Programming",
      "generated": {
        "levelDefinitions": 6,
        "badgeDefinitions": 3,
        "totalXPRange": "0 - 2000+"
      }
    }
  }
}
```

#### 2. Get Modules by Class
```http
GET /api/content/modules/class/:classId
Authorization: Bearer <token>
```

#### 3. Get Module by ID
```http
GET /api/content/modules/:id
Authorization: Bearer <token>
```

#### 4. Create Content Item
```http
POST /api/content/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "moduleId": 1,
  "title": "Variables and Data Types",
  "itemType": "Quiz",
  "contentBody": "...",
  "sequenceOrder": 1
}
```

## XP Calculation Formula

### Base XP
```
baseXP = (totalQuestions × 10) × (score / 100)
```

### Bonuses
- **Perfect Score (100%)**: +50 XP
- **High Score (90-99%)**: +25 XP

### Example Calculations

| Questions | Score | Base XP | Bonus | Total XP |
|-----------|-------|---------|-------|----------|
| 10        | 100%  | 100     | +50   | **150**  |
| 10        | 95%   | 95      | +25   | **120**  |
| 10        | 85%   | 85      | +0    | **85**   |
| 20        | 100%  | 200     | +50   | **250**  |
| 5         | 80%   | 40      | +0    | **40**   |

## Level Progression

Default level thresholds (auto-generated per module):

| Level | Title        | XP Required | XP to Next Level |
|-------|--------------|-------------|------------------|
| 1     | Novice       | 0           | 100              |
| 2     | Learner      | 100         | 150              |
| 3     | Apprentice   | 250         | 250              |
| 4     | Practitioner | 500         | 500              |
| 5     | Expert       | 1000        | 1000             |
| 6     | Master       | 2000        | ∞                |

## Badge System

### Badge Types

1. **Completion Badges**
   - Criteria: Complete 100% of module content
   - XP Reward: 200 XP
   - Auto-generated for every module

2. **Mastery Badges**
   - Criteria: Achieve 95%+ score
   - XP Reward: 300 XP
   - Recognizes excellence

3. **Special Badges**
   - Criteria: Perfect score (100%)
   - XP Reward: 150 XP
   - Rare achievement

## Usage Workflow

### For Teachers

1. **Create a New Course Module**
   ```bash
   POST /api/content/modules
   {
     "classId": 1,
     "title": "JavaScript Basics",
     "autoGenerateGamification": true,
     "totalQuestions": 15
   }
   ```

2. **System Automatically Creates:**
   - 6 level definitions
   - 3 badge templates
   - XP thresholds

3. **Add Content Items to Module**
   ```bash
   POST /api/content/items
   {
     "moduleId": 1,
     "title": "Introduction Quiz",
     "itemType": "Quiz",
     "contentBody": "..."
   }
   ```

### For Students

1. **Complete Quiz/Assignment**
   - Frontend submits score to backend

2. **System Awards XP**
   ```bash
   POST /api/gamification/award-xp
   {
     "moduleId": 1,
     "contentItemId": 5,
     "score": 90,
     "totalQuestions": 10
   }
   ```

3. **System Automatically:**
   - Calculates XP based on score
   - Awards bonuses for high scores
   - Checks for level ups
   - Awards badges if criteria met
   - Updates progress tracking

4. **View Progress**
   ```bash
   GET /api/gamification/progress/1
   ```

5. **View Leaderboard**
   ```bash
   GET /api/gamification/leaderboard/1
   ```

## Database Migration

Run the migration to create gamification tables:

```bash
docker-compose exec backend npm run migrate
```

This will:
1. Create `BadgeDefinitions` table
2. Create `UserProgress` table
3. Create `XPTransactions` table
4. Create `LevelDefinitions` table
5. Update `Badges` table with foreign key

## Integration Points

### Automatic Triggers

1. **Module Creation** → Auto-generates levels and badges
2. **Content Completion** → Awards XP
3. **XP Award** → Checks level up
4. **Level Up** → Checks badge criteria
5. **Badge Award** → Awards bonus XP

### Manual Triggers

- Teachers can manually regenerate gamification for existing modules
- Admins can customize badge criteria
- System supports multiple gamification strategies per module

## Testing the System

### 1. Create a Test Module
```bash
curl -X POST http://localhost:5000/api/content/modules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classId": 1,
    "title": "Test Module",
    "description": "Testing gamification",
    "autoGenerateGamification": true,
    "totalQuestions": 10
  }'
```

### 2. Award XP for Quiz Completion
```bash
curl -X POST http://localhost:5000/api/gamification/award-xp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": 1,
    "contentItemId": 1,
    "score": 100,
    "totalQuestions": 10,
    "reason": "First Quiz"
  }'
```

### 3. Check Progress
```bash
curl http://localhost:5000/api/gamification/progress/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Teacher Creates Module                   │
│                    /api/content/modules                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              Auto-Generate Gamification                      │
│         GPE_Service.generateCourseGamification()             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • Create 6 Level Definitions                       │    │
│  │  • Create 3 Badge Definitions                       │    │
│  │  • Set XP Thresholds                                │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                  Student Completes Content                   │
│                /api/gamification/award-xp                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   GPE_Service.calculateXP()                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1. Calculate base XP + bonuses                     │    │
│  │  2. Create XP transaction                           │    │
│  │  3. Update user progress                            │    │
│  │  4. Check level up                                  │    │
│  │  5. Check badge awards                              │    │
│  │  6. Return comprehensive result                     │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Real-time Progress Update                 │
│               XP | Level | Badges | Completion %             │
└─────────────────────────────────────────────────────────────┘
```

## Extensibility

The system is designed to be extensible:

### Custom Badge Types
Add new badge types in the ENUM:
```javascript
badgeType: ENUM("Completion", "Mastery", "Streak", "Special", "YourNewType")
```

### Custom XP Formulas
Modify `calculateXP` in `gpeService.js`:
```javascript
// Add time-based bonuses
const timeBonus = completedInUnder5Min ? 30 : 0;
```

### Custom Level Progression
Modify `generateCourseGamification` to create different level structures:
```javascript
// Exponential progression
{ level: 1, xpThreshold: 0 },
{ level: 2, xpThreshold: 100 },
{ level: 3, xpThreshold: 300 },
{ level: 4, xpThreshold: 900 },
```

## Security Considerations

1. All endpoints require authentication (`verifyToken` middleware)
2. Teachers can only modify their own modules
3. Students cannot directly award XP (must go through quiz system)
4. XP transactions are immutable (audit trail)
5. Badge awards are logged with timestamps

## Performance Optimizations

1. Indexed foreign keys on all gamification tables
2. Batch XP calculations for multiple submissions
3. Cached leaderboards (can be added with Redis)
4. Async badge checking (doesn't block XP award)

## Future Enhancements

- [ ] Streak badges (X days in a row)
- [ ] Social features (share badges)
- [ ] Badge icons/images
- [ ] Global leaderboards across all modules
- [ ] XP decay for inactive users
- [ ] Custom badge designer for teachers
- [ ] Achievement notifications
- [ ] Gamification analytics dashboard

---

## Sprint 2 Completion Summary

✅ **Task 2.1**: Built `calculateXP` and `checkLevelUp` logic with:
- Dynamic XP calculation based on score
- Automatic level progression
- Bonus XP for high scores
- Progress tracking

✅ **Task 2.2**: Implemented automated gamification generation:
- Auto-generates levels, badges, and XP thresholds
- Triggers on module creation
- Creates course-specific completion badges
- Fully integrated with content management system

**Total Files Created/Modified:**
- 1 Migration file
- 5 New models
- 1 GPE Service class
- 2 Controllers
- 3 Routes
- 1 App.js update

**Ready for Production!** 🚀
