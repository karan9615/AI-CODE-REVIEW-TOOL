# GitLab MR AI Review - Modern UI

A modern, industry-level React application for AI-powered GitLab merge request reviews.

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── LoginView.jsx           # Authentication component
│   ├── common/
│   │   ├── Header.jsx              # Reusable header component
│   │   ├── Alert.jsx               # Alert/notification component
│   │   └── ProgressSteps.jsx       # Progress indicator component
│   ├── projects/
│   │   ├── ProjectCard.jsx         # Individual project card
│   │   └── ProjectSelector.jsx     # Project selection view
│   ├── mergeRequests/
│   │   ├── CreateMR.jsx            # Create merge request view
│   │   ├── ReviewMRs.jsx           # Review existing MRs view
│   │   └── MRCard.jsx              # MR card component
│   └── layout/
│       └── MainApp.jsx             # Main application layout
├── config/
│   └── theme.js                    # Theme configuration
├── styles/
│   └── commonStyles.js             # Shared styles
├── utils/
│   └── api.js                      # API utility functions
├── App.jsx                         # Root application component
├── main.jsx                        # Application entry point
└── index.css                       # Global CSS styles
```

## 🚀 Features

### 1. **Authentication**

- GitLab personal access token login
- Secure token handling
- Error validation

### 2. **Project Management**

- List all accessible projects
- Search functionality
- Modern card-based UI

### 3. **Create Merge Requests**

- Select source and target branches
- Choose AI model (GPT-4, Gemini)
- Real-time progress tracking
- Automatic AI review comments

### 4. **Review Existing MRs**

- List all assigned merge requests
- One-click AI review
- Direct links to GitLab
- Success/error feedback

## 🎨 Design System

### Colors

- **Primary**: Indigo (#6366f1)
- **Success**: Green (#10b981)
- **Error**: Red (#ef4444)
- **Grays**: 50-900 scale

### Components

- Modern card-based layouts
- Smooth transitions and animations
- Consistent spacing and typography
- Responsive design patterns

## 📦 Installation

```bash
npm install
```

## 🔧 Configuration

Update the API endpoint in `src/utils/api.js`:

```javascript
const response = await fetch("YOUR_API_ENDPOINT" + path, {
  // ...
});
```

## 🏃 Running

```bash
npm run dev
```

## 🔌 Backend API Endpoints Required

### Authentication & Projects

- `POST /api/projects` - List all projects
  - Body: `{ token }`

### Branches

- `POST /api/branches` - List project branches
  - Body: `{ token, projectId }`

### Merge Requests

- `POST /api/mr` - Create new MR with AI review

  - Body: `{ token, projectId, model, mr: { source_branch, target_branch } }`

- `POST /api/mrs` - List merge requests

  - Body: `{ token, projectId }`

- `POST /api/review-mr` - Review existing MR with AI
  - Body: `{ token, projectId, mrIid, model }`

## 📝 Component Documentation

### LoginView

Handles user authentication with GitLab personal access token.

### ProjectSelector

Displays all accessible projects with search functionality.

### CreateMR

Interface for creating new merge requests with AI review.

### ReviewMRs

Lists and manages AI reviews for existing merge requests.

### Header

Reusable header component with navigation and logout.

### Alert

Displays success/error messages with appropriate styling.

### ProgressSteps

Shows multi-step progress for long-running operations.

## 🎯 Best Practices Implemented

1. **Component Separation**: Each component has a single responsibility
2. **Reusability**: Common components (Alert, Header, etc.) are shared
3. **Style Management**: Centralized theme and common styles
4. **API Layer**: Separated API logic from components
5. **Error Handling**: Comprehensive error states
6. **Loading States**: Clear feedback during async operations
7. **Accessibility**: Semantic HTML and proper ARIA attributes

## 🔐 Security Notes

- Never commit tokens to version control
- Use environment variables for sensitive data
- Implement proper CORS policies on backend
- Validate all user inputs

## 🚀 Future Enhancements

- [ ] Diff viewer for code changes
- [ ] Comment threads management
- [ ] Real-time notifications
- [ ] Dark mode support
- [ ] Multiple project support
- [ ] Advanced filtering options
