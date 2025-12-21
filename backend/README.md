# Backend – GitLab MR AI Review

This backend powers the AI-driven GitLab Merge Request review tool. It is designed for extensibility, security, and robust AI integration.

## Features

- AI-powered code review using multiple providers (OpenAI, Google Gemini, etc.)
- Modular provider/adapters system for easy extension
- Secure API key management
- Comprehensive error handling and logging
- RESTful API endpoints for MR creation, review, and configuration

## Project Structure

```
backend/
├── package.json
├── config/
│   ├── envConfig.js
│   └── review.rules.json
├── src/
│   ├── app.js
│   ├── server.js
│   ├── ai/
│   │   ├── aiRouter.js
│   │   ├── AIService.js
│   │   └── providers/
│   │       ├── GoogleProvider.js
│   │       └── OpenAIProvider.js
│   ├── config/
│   │   ├── aiConfig.js
│   │   └── models.js
│   ├── controllers/
│   │   ├── configController.js
│   │   ├── gitlabController.js
│   │   └── mrController.js
│   ├── gitlab/
│   │   ├── gitlabClient.js
│   │   └── gitlabService.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── review/
│   │   └── reviewService.js
│   └── routes/
│       ├── configRoutes.js
│       ├── gitlabRoutes.js
│       ├── index.js
│       └── mrRoutes.js
```

## Adding a New AI Provider/Adapter

1. **Create a new provider** in `src/ai/providers/` (see `OpenAIProvider.js` as a template).
2. **Register the provider** in `src/ai/AIService.js` by adding it to `PROVIDER_REGISTRY`.
3. **Add provider and models** to `src/config/aiConfig.js` under `AI_PROVIDERS`.

## Adding a Model to an Existing Provider

1. Edit `src/config/aiConfig.js` and add a new model object to the relevant provider's `models` array.
2. Ensure the provider's code supports the new model (usually just passes the model name from config).

## Running the Backend

```sh
cd backend
npm install
npm start
```

## Environment Variables

- Configure your API keys and secrets in `.env` or `config/envConfig.js`.

---

For more, see the root README or contact the maintainer.
