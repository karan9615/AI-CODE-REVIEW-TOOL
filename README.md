# GitLab MR AI Review – Monorepo

This project is an AI-powered GitLab Merge Request creation and review tool, featuring a modern frontend and a robust, extensible backend.

## Structure

```
.
├── backend/   # Node.js/Express API server (AI, GitLab integration)
├── frontend/  # React + Tailwind modern UI
└── README.md  # (this file)
```

## Quick Start

1. **Clone the repo**
2. **Install dependencies**
   ```sh
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Configure environment variables**
   - Backend: see `backend/config/envConfig.js` or `.env`
   - Frontend: see `.env` if needed
4. **Run the backend**
   ```sh
   cd backend && npm start
   ```
5. **Run the frontend**
   ```sh
   cd frontend && npm run dev
   ```

## Adding AI Providers/Models

- See `backend/README.md` for details on adding new adapters/providers or models.

## Features

- AI-powered code review (OpenAI, Gemini, etc.)
- Modern, responsive UI
- Secure, production-ready architecture

---

For more details, see the `backend/README.md` and `frontend/README.md` files.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- GitLab account with API access
- OpenAI API key OR Google Gemini API key

### Installation

1. **Clone the repository**

```bash
cd /Users/karangupta/Downloads/gitlab-mr-ai-review-complete
```

2. **Set up environment variables**

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API keys:
# OPENAI_API_KEY=your_openai_key_here
# GEMINI_API_KEY=your_gemini_key_here
```

3. **Install backend dependencies**

```bash
cd backend
npm install
```

4. **Install frontend dependencies**

```bash
cd ../frontend
npm install
```

### Running the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

Backend runs on http://localhost:3001

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:5173

### Getting API Keys

**OpenAI (ChatGPT):**

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env` as `OPENAI_API_KEY`

**Google Gemini:**

1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to `.env` as `GEMINI_API_KEY`

**GitLab Personal Access Token:**

1. Go to GitLab → Settings → Access Tokens
2. Create token with `api` scope
3. Use in the UI login form

## 📋 Usage

1. **Login**

   - Enter your GitLab username/email (optional)
   - Enter your GitLab Personal Access Token
   - Click "Load Projects"

2. **Select Project**

   - Choose the project where you want to create an MR

3. **Create Merge Request**

   - Select source branch (your feature branch)
   - Select target branch (usually `main` or `develop`)
   - Choose AI model (ChatGPT or Gemini)
   - Click "Create & Review Merge Request"

4. **Review**
   - AI analyzes the code changes
   - Generates MR title and description
   - Creates the MR in GitLab
   - Posts inline review comments automatically

## 🔧 Technical Improvements Made

### Backend Improvements

1. **MR Change Type Handling** ([reviewService.js](backend/src/review/reviewService.js))

   - ✅ New files: Uses `line` only
   - ✅ Deleted files: Uses `oldLine` only
   - ✅ Renamed files: Properly maps `oldPath` and `filePath`
   - ✅ Modified files: Handles both additions and deletions

2. **Error Handling** ([routes.js](backend/src/routes/routes.js))

   - ✅ Request validation middleware
   - ✅ Detailed error responses
   - ✅ Logging for debugging
   - ✅ Graceful degradation (continues even if some comments fail)

3. **Security** ([ai adapters](backend/src/ai/))

   - ✅ Removed hardcoded API keys
   - ✅ Environment variable enforcement
   - ✅ Proper token validation

4. **Code Quality**
   - ✅ Fixed model names (`gpt-4`, `gemini-1.5-flash`)
   - ✅ Better AI prompts for accuracy
   - ✅ Array validation for inline comments

### Frontend Improvements

1. **UI/UX** ([App.jsx](frontend/src/App.jsx), [App.css](frontend/src/App.css))

   - ✅ GitLab purple (#6b4fbb) color theme
   - ✅ Professional card-based layout
   - ✅ Project icons and badges
   - ✅ Responsive design

2. **User Feedback**

   - ✅ Loading spinners on buttons
   - ✅ Progress steps during MR creation
   - ✅ Success alerts with MR links
   - ✅ Error alerts with actionable messages
   - ✅ Comment posting statistics

3. **Form Handling**

   - ✅ Input validation before submission
   - ✅ Disabled states during API calls
   - ✅ Help text for all form fields
   - ✅ Keyboard shortcuts (Enter to submit)
   - ✅ Branch comparison preview

4. **API Integration** ([api.js](frontend/src/api.js))
   - ✅ Proper error handling
   - ✅ HTTP status code checking
   - ✅ Error message extraction

## 📁 Project Structure

```
gitlab-mr-ai-review-complete/
├── backend/
│   ├── src/
│   │   ├── ai/
│   │   │   ├── aiRouter.js          # AI model routing
│   │   │   ├── chatgptAdapter.js    # OpenAI integration
│   │   │   └── geminiAdapter.js     # Google Gemini integration
│   │   ├── gitlab/
│   │   │   ├── gitlabClient.js      # Axios client setup
│   │   │   └── gitlabService.js     # GitLab API methods
│   │   ├── review/
│   │   │   └── reviewService.js     # AI review logic
│   │   ├── app.js                   # Express app setup
│   │   ├── routes.js                # API endpoints
│   │   └── server.js                # Server entry point
│   ├── config/
│   │   └── review.rules.json        # Code review rules
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main React component
│   │   ├── App.css                  # GitLab-inspired styles
│   │   ├── api.js                   # API client
│   │   └── main.jsx                 # React entry point
│   ├── index.html
│   └── package.json
└── .env.example                     # Environment variables template
```

## 🚀 Production Deployment

### Deploying to Render (Backend) + Netlify (Frontend)

This guide helps you deploy the backend to [Render](https://render.com) and the frontend to [Netlify](https://netlify.com).

#### Backend Deployment (Render)

1. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Choose the `backend` directory as the root directory
   - Build command: `npm install`
   - Start command: `npm start`

2. **Configure Environment Variables on Render**
   
   Go to your service's Environment tab and add:

   ```
   NODE_ENV=production
   CLIENT_URL=https://your-frontend-app.netlify.app
   SESSION_SECRET=<generate-a-strong-random-secret>
   OPENAI_API_KEY=<your-openai-key>
   GEMINI_API_KEY=<your-gemini-key>
   ```

   **Important Notes:**
   - `CLIENT_URL` must exactly match your Netlify frontend URL (no trailing slash)
   - Generate `SESSION_SECRET` with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Render automatically provides HTTPS (required for secure cookies)

3. **Verify Deployment**
   
   After deployment, check the health endpoint:
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```
   
   This should return configuration details including:
   - CLIENT_URL being used
   - Cookie settings (secure: true, sameSite: "none")
   - Environment mode

#### Frontend Deployment (Netlify)

1. **Create a new Site on Netlify**
   - Connect your GitHub repository
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`

2. **Configure Environment Variables on Netlify**
   
   Go to Site settings → Environment variables and add:

   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

3. **Update CORS Settings**
   
   After getting your Netlify URL, go back to Render and update:
   ```
   CLIENT_URL=https://your-actual-app.netlify.app
   ```

#### Testing Cross-Origin Authentication

After deployment, verify that authentication works:

1. **Test Login Flow**
   - Open your Netlify frontend URL
   - Login with GitLab token
   - Check browser DevTools → Application → Cookies
   - Verify session cookie has: `Secure: true`, `SameSite: None`, `HttpOnly: true`

2. **Test API Requests**
   - After login, try loading projects
   - Check browser DevTools → Network tab
   - Verify requests to your Render backend include the session cookie
   - Check Response headers for proper CORS headers

3. **Debug Issues**
   - If authentication fails, check backend logs on Render
   - Look for authentication attempt logs (✅ or ❌ markers)
   - Verify CLIENT_URL matches exactly (check /api/health)
   - Ensure both sites use HTTPS

#### Common Deployment Issues

**"Unauthorized: Valid GitLab Token required"**
- Check CLIENT_URL is set correctly on Render
- Verify session cookie is set with SameSite=None and Secure=true
- Check browser console for CORS errors

**"CORS policy error"**
- Ensure CLIENT_URL exactly matches your Netlify URL
- Remove any trailing slashes from CLIENT_URL
- Verify VITE_API_URL on Netlify points to Render backend

**Session cookie not being set**
- Both frontend and backend must use HTTPS in production
- Check browser blocks third-party cookies (test in incognito mode)
- Verify cookie settings in /api/health endpoint response

## 📁 Project Structure (Development)

```
gitlab-mr-ai-review-complete/
├── backend/
│   ├── src/
│   │   ├── ai/
│   │   │   ├── aiRouter.js          # AI model routing
│   │   │   ├── chatgptAdapter.js    # OpenAI integration
│   │   │   └── geminiAdapter.js     # Google Gemini integration
│   │   ├── gitlab/
│   │   │   ├── gitlabClient.js      # Axios client setup
│   │   │   └── gitlabService.js     # GitLab API methods
│   │   ├── review/
│   │   │   └── reviewService.js     # AI review logic
│   │   ├── app.js                   # Express app setup
│   │   ├── routes.js                # API endpoints
│   │   └── server.js                # Server entry point
│   ├── config/
│   │   └── review.rules.json        # Code review rules
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main React component
│   │   ├── App.css                  # GitLab-inspired styles
│   │   ├── api.js                   # API client
│   │   └── main.jsx                 # React entry point
│   ├── index.html
│   └── package.json
└── .env.example                     # Environment variables template
```

## 🐛 Troubleshooting

**"Failed to load projects"**

- Verify your GitLab token has `api` scope
- Check if token is expired
- Ensure you have access to at least one project

**"Missing diff_refs SHAs"**

- Ensure branches have different commits
- Try with branches that have actual code changes

**"No differences found between branches"**

- Branches are identical
- Select different source/target branches

**AI comments not appearing**

- Check backend logs for specific errors
- Verify AI API keys are set correctly
- Some comments may fail due to GitLab API limitations (check response)

## 🎯 Suggested Enhancements

Would you like me to implement any of these?

1. **Rate Limiting & Retries**

   - Add exponential backoff for failed API calls
   - Rate limit protection for GitLab API

2. **Batch Comment Posting**

   - Post comments in batches to avoid rate limits
   - Progress bar for comment posting

3. **Review Templates**

   - Customizable review rules per project
   - Multiple review profiles (strict, moderate, lenient)

4. **Diff Preview**

   - Show code changes in UI before creating MR
   - Inline diff viewer with syntax highlighting

5. **MR Templates**

   - Save and reuse MR templates
   - Project-specific templates

6. **Webhook Integration**

   - Auto-review new MRs created in GitLab
   - Comment on existing MRs

7. **Multi-Model Consensus**

   - Run multiple AI models and combine results
   - Weighted scoring system

8. **Analytics Dashboard**
   - Track MR creation statistics
   - Review comment effectiveness metrics

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

**Made with ❤️ using React, Express, OpenAI, and Google Gemini**
