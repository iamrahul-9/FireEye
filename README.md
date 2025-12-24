# FireEye

**Fire Safety Management, Reimagined.**

FireEye is a next-generation SaaS platform designed to streamline fire safety inspections, asset management, and compliance reporting for modern facilities.

## User Flow & Capabilities

### 1. Onboarding
*   **Login/Signup**: Secure authentication flow to access the platform.
*   **Setup**: Initial configuration for facility managers to establish their workspace.

### 2. Command Center (Dashboard)
The central hub for all operations.
*   **KPI Overview**: Instant checks on compliance rates, pending inspections, and critical issues.
*   **Action Lists**: Prioritized lists for upcoming, pending, and urgent inspection tasks.
*   **Timeline**: A visual history of past and future inspection events.

### 3. Client Management
Manage your portfolio of properties and clients.
*   **Client Profiles**: Detailed records for each client, including locations and contact info.
*   **Asset Tracking**: Maintain a digital inventory of fire safety assets for each client.

### 4. Smart Inspections
Perform efficient and accurate safety checks.
*   **Digital Forms**: Streamlined inspection forms to replace paper processes.
*   **Critical Issues**: Automatically flag and track critical safety violations.
*   **Status Tracking**: Monitor inspections from scheduling to completion.

### 5. Compliance Reports
Generate actionable insights.
*   **Matrix Reports**: comprehensive views of inspection data.
*   **Export**: Download detailed PDF reports for clients and internal audit.
*   **Analytics**: Track trends in compliance and safety over time.

## Getting Started

Follow these steps to run the application locally:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Create a `.env.local` file with your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment

This application is optimized for deployment on **Vercel**.
*   **CI/CD**: specific GitHub Actions (`.github/workflows/ci.yml`) run on every push to ensure code quality.
*   **Production**: Changes to the `main` branch are automatically deployed to production.
