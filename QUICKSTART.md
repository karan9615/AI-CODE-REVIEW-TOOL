# 🚀 GitLab AI Review - Quick Start Guide

## Prerequisites

- Node.js 18+
- GitLab account with API access
- OpenAI API Key OR Google Gemini API Key

## Installation & Setup

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend (.env):**

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```bash
# Required: At least one AI provider
OPENAI_API_KEY=sk-...
# OR
GEMINI_API_KEY=...

# Optional: Session secret (auto-generated if not provided)
SESSION_SECRET=your-secret-key-here
```

**Frontend (.env):**

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3001/api
```

### 3. Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

**Access the app:**

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Usage

1. **Login**: Enter your GitLab Personal Access Token

   - Go to GitLab → Settings → Access Tokens
   - Create token with `api` scope

2. **Select Project**: Choose from your GitLab projects

3. **Create MR with AI Review**:

   - Select source and target branches
   - Choose AI model
   - Click "Process Merge Request"

4. **Review Existing MRs**:
   - Switch to "Review Requests" tab
   - Select an MR
   - Choose AI model
   - Click "Start AI Review"

## Features

- ✅ AI-powered code reviews (OpenAI/Gemini)
- ✅ Auto-generated MR titles and descriptions
- ✅ Inline comments on changed code
- ✅ Secure session-based authentication
- ✅ Beautiful dark/light theme
- ✅ Real-time progress indicators

## Troubleshooting

**"Projects not loading"**

- Check your GitLab token has `api` scope
- Verify token is valid (not expired)
- Check backend logs in terminal

**"AI Review failing"**

- Verify API key is correct in backend/.env
- Check you have API credits/quota
- See backend terminal for error details

**"CORS errors"**

- Make sure backend is running on port 3001
- Check VITE_API_URL in frontend/.env

## Useful Commands

```bash
# Backend
npm start          # Start server
npm run dev        # Start with nodemon (auto-reload)

# Frontend
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

## Tips

- Keep both terminals open to see logs
- Use Chrome DevTools Network tab to debug API calls
- Check browser console for frontend errors
- Session cookies work automatically - no need to manually handle tokens

Enjoy! 🎉
