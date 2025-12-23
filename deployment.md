# FireEye Deployment Strategy

**Objective**: Free production deployment with automatic CI/CD, zero downtime updates, and easy migration path.

## 1. Primary Hosting: Vercel (Free Tier)
- **Frontend**: Next.js (App Router)
- **Functions**: API Routes / Server Actions
- **Database**: Supabase (External, coupled via ENV)

## 2. CI/CD Pipeline
**Tool**: Vercel + GitHub Integration.

### Flow
1. **Push to GitHub** (`main` branch)
2. **Vercel** detects change
3. **Builds** Next.js app
4. **Deploys** to Production (if build succeeds)

### Branch Rules
- `main` -> **Production**
- `dev`/`feature-*` -> **Preview Deployments** (Automatic staging URLs)

## 3. Environment Variables
**Critical**: Never commit secrets. Manage them in Vercel > Settings > Environment Variables.

Required Variables:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Add any other secrets here
```

## 4. CI Checks (GitHub Actions)
We have added a `.github/workflows/ci.yml` to run sanity checks on every push:
- `npm install`
- `npm run lint`
- `npm run build`

## 5. Migration Strategy
This app is designed as a **Stateless** container.
- **To Docker**: Create a `Dockerfile` (Standard Node/Next.js).
- **To AWS**: Use Amplify or ECS.
- **To Azure**: Use App Service.

No code changes are required to move, only configuration.
