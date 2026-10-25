# 📅 Nhật Ký Học Tập & Giao Việc Nhóm (Daily Tracker & Team Tasks)

A modern, responsive, calendar-style web application combining **Part 1: Personal Study Habit Tracker & Diary** with **Part 2: Collaborative Team Task Assignment & Tracking** — featuring ambient **Three.js 3D visuals**, real-time synchronization, instant notifications, and multi-user collaboration.

---

## 🌟 Key Highlights

### 📖 Part 1: Personal Study Habit Tracker
- **3-in-1 Daily Habit Check**: Direct checkbox clicking for 💡 *Kiến thức mới*, 🇬🇧 *Học Tiếng Anh*, and 📖 *Đọc sách*.
- **100% Private Diary Notes**: Debounced auto-saving daily journal stored in private user partition.
- **Rewarding Celebrations**: Dynamic 3D star/confetti bursts on day completion and streak flames.
- **Offline-First**: Fully functional without network access, using local storage.

### 👥 Part 2: Collaborative Team Task Assignment
- **Visual Calendar States**:
  - 🟢 **Emerald glow with check badge**: All tasks for that day completed.
  - 🟡 **Progress indicator / mini ring (`x/y`)**: Partially completed days.
  - 🟣 **Violet dot**: Tasks awaiting review/approval ("Chờ duyệt").
  - 🔴 **Warning tint**: Overdue tasks.
  - ➕ **Faint `+` icon on hover**: Quick task creation for empty cells.
  - 💫 **Glowing animated border**: Current day highlight.
- **Animated Stats Cards & Leaderboard**:
  - Live animated count-up for Total Tasks, Completed, Overdue, and Completion Rate %.
  - Member leaderboard in "Cả nhóm" mode displaying top task finishers with avatars.
- **Fast Filters & Quick Check**:
  - Filter by Status (*Chưa làm, Đang làm, Chờ duyệt, Hoàn thành*), Priority (*Thấp, Trung bình, Cao, Khẩn cấp*), Category, and Assignee.
  - Collapsible **"Việc hôm nay"** drawer for rapid daily task check-offs.
- **Real-time Notifications**:
  - In-app notification bell with unread badge counter for new assignments, approval/rework notices, new comments, 24h deadline reminders, and overdue alerts.
  - Optional browser push notifications with native permission prompt.
- **Security & Privacy (Server-Side Enforced)**:
  - Input length limits (titles: max 200 chars, descriptions/comments: max 1000 chars) and text sanitization against XSS.
  - Server-side access rules: Users can only access groups they belong to; assigners/admins manage tasks; assignees update statuses; owners manage roles.
  - No private service-role secrets exposed in client bundles.

---

## 🚀 Step-by-Step Setup Guide

### 1. Prerequisites
- **Node.js**: v18.x or v20.x or higher
- **npm**: v9.x or higher
- A free **Firebase** or **Supabase** account

---

### 2. Backend Project Setup (Firebase)

The application supports **Firebase Realtime Database** and **Cloud Firestore** out of the box.

#### Step 2.1: Create Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/) and click **"Add project"**.
2. Name your project (e.g. `nhatky-tracker`) and finish creation.

#### Step 2.2: Enable Authentication (Google Sign-In)
1. In the left navigation, go to **Build > Authentication** > **Get Started**.
2. In the **Sign-in method** tab, click **Google**, toggle **Enable**, select your support email, and click **Save**.

#### Step 2.3: Set Up Database

##### Option A: Realtime Database (Recommended for instant real-time sync)
1. Go to **Build > Realtime Database** > **Create Database**.
2. Select your closest location (e.g., `asia-southeast1`).
3. Click the **Rules** tab, replace the contents with `database.rules.json` from this repository, and click **Publish**:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null && auth.uid === $uid",
           ".write": "auth != null && auth.uid === $uid"
         }
       },
       "groups": {
         ".read": "auth != null",
         "$groupId": {
           ".write": "auth != null && (!data.exists() || data.child('ownerId').val() === auth.uid || root.child('groups').child($groupId).child('members').child(auth.uid).exists())",
           "name": { ".validate": "newData.isString() && newData.val().length <= 200" },
           "description": { ".validate": "newData.isString() && newData.val().length <= 1000" }
         }
       },
       "tasks": {
         ".read": "auth != null",
         "$groupId": {
           ".write": "auth != null",
           "$taskId": {
             "title": { ".validate": "newData.isString() && newData.val().length <= 200" },
             "description": { ".validate": "newData.isString() && newData.val().length <= 1000" }
           }
         }
       }
     }
   }
   ```

##### Option B: Cloud Firestore
1. Go to **Build > Firestore Database** > **Create database**.
2. Choose **Production mode** and your preferred region.
3. In the **Rules** tab, paste the contents of `firestore.rules` and click **Publish**.

#### Step 2.4: Register Web App & Get Credentials
1. Go to **Project Settings** (gear icon) > **General**.
2. Under **Your apps**, click the Web icon (`</>`) to add a web app.
3. Register the app (e.g., `nhatky-web`).
4. Copy the `firebaseConfig` object values.

---

### 3. Alternative: Supabase Backend (PostgreSQL)

If you prefer Supabase over Firebase:
1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor**.
3. Open `supabase_migration.sql` from this repository, paste the entire SQL script, and click **Run**.
4. This creates all tables (`profiles`, `groups`, `group_members`, `invites`, `tasks`, `task_assignees`, `task_comments`, `task_completions`, `notifications`), establishes RLS policies, and inserts starter seed data.

---

### 4. Configure Environment Variables

1. Copy the example configuration template:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Firebase project credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.region.firebasedatabase.app
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
> **Security Note:** Never commit `.env` or production service-account secret keys to public version control. Only public client anon keys prefixed with `VITE_` should be loaded into frontend bundles.

---

### 5. Running Locally

1. Install project dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser at `http://localhost:5173/`.

---

### 6. Configure Google OAuth Authorized Domains

Before deploying to a public domain, authorize your production URL in Google Authentication:
1. In the **Firebase Console**, go to **Build > Authentication > Settings**.
2. Under the **Authorized domains** section, click **Add domain**.
3. Add your production deployment domain:
   - `localhost` (default for local development)
   - `your-app-name.vercel.app` (for Vercel)
   - `your-app-name.netlify.app` (for Netlify)
   - `your-username.github.io` (for GitHub Pages)

---

### 7. Building for Production

Compile and bundle the frontend into static assets:
```bash
npm run build
```
The optimized bundle will be generated in the `dist/` directory. You can test the production build locally with:
```bash
npm run preview
```

---

### 8. Deploying to Public Hosting

#### Deploy to Vercel (Recommended)
1. Install the Vercel CLI or link through [vercel.com](https://vercel.com):
   ```bash
   npm i -g vercel
   vercel
   ```
2. Under **Project Settings > Environment Variables**, add your `VITE_FIREBASE_*` variables.
3. Deploy to production:
   ```bash
   vercel --prod
   ```

#### Deploy to Netlify
1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Deploy via Netlify CLI or drag-and-drop `dist/` on [app.netlify.com](https://app.netlify.com):
   ```bash
   npx netlify deploy --prod --dir=dist
   ```
The included `netlify.toml` automatically handles SPA routing and header caching.

---

## 🔒 Data Architecture & Permissions

### Privacy Separation
- **Part 1 (Personal Study Diary)**:
  - Personal study checklists, notes, and habits are kept **strictly private**.
  - Stored under each user's unique path (`users/{uid}/studyTracker`), strictly readable and writable only by the authenticated account owner.
  - Fully functional offline; data is cached in `localStorage` and synced when back online.
- **Part 2 (Collaborative Tasks)**:
  - Groups and tasks are organized under `groups/{groupId}`.
  - Server-side security rules enforce that only members of the group can view tasks.
  - Task creation, modification, and deletion are restricted to assigners, group admins, and group owners.
  - Task assignees can update status (e.g. submit for "Chờ duyệt") and post comments.

### Data Validation & XSS Prevention
- All user inputs are sanitized client-side via `sanitizeText` (`src/services/securityUtils.js`) to neutralize HTML injection.
- Input length limits:
  - Task & Group Titles: **200 characters max**
  - Descriptions & Notes: **1000 characters max**
  - Comments: **1000 characters max**
- Enforced both in UI inputs and validated server-side in database security rules.

### JSON Export & Import Format (Version 2)
The application includes an extended JSON export/import mechanism:
```json
{
  "version": 2,
  "exportedAt": "2026-10-25T14:00:00.000Z",
  "studyData": {
    "2026-10-25": {
      "newKnowledge": true,
      "english": true,
      "reading": false,
      "note": "Reflections for today..."
    }
  },
  "tasks": [
    {
      "id": "task_1",
      "title": "Review PR",
      "status": "completed"
    }
  ],
  "groups": []
}
```
*Backward Compatibility*: Legacy study-only JSON backups (Version 1) remain 100% importable without errors.

---

## 💻 Tech Stack
- **Frontend Framework**: React 18 with Vite 8
- **3D Ambient Graphics**: Three.js (v0.160+)
- **Styling**: Vanilla CSS (modular design tokens, dark/light mode, glassmorphism, responsive grid)
- **Backend & Auth**: Firebase Authentication (Google OAuth), Realtime Database & Cloud Firestore (optional Supabase migration included)
- **Icons**: Lucide React & custom SVGs
