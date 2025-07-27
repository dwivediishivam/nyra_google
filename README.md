# Nyra Thread Tracker

This is a Next.js web application that serves as an admin console for tracking and managing issues reported via mentions on Meta's Threads platform. It uses Firebase for backend services (Firestore, Functions) and Google's Gemini AI for clustering threads into actionable issues.

## Features

- **Fetch Threads Mentions**: Connects to the Threads API to fetch mentions of a specified user (`@nykacity`).
- **AI-Powered Issue Clustering**: Uses Gemini to cluster new threads into existing issues based on textual and location similarity.
- **Automatic Issue Management**: Automatically creates new issues when a thread doesn't match an existing one and updates issues with new reports.
- **Automated Replies**: Posts a reply to the original thread acknowledging the report with a unique issue ID.
- **Real-time Admin Dashboard**: A clean UI to view and filter all threads and issues in real-time.

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: React, Tailwind CSS, ShadCN/UI
- **Backend**: Next.js Server Actions (deployable as Firebase Functions)
- **Database**: Firestore
- **AI**: Google Gemini

## Project Setup

Follow these steps to get the project running locally.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Python 3](https://www.python.org/downloads/) (for the API check script)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- A Firebase project
- A Meta Developer App with access to the Threads API
- A Google Cloud project with the Gemini API enabled

### 2. Clone the repository

```bash
git clone <repository-url>
cd <repository-name>
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up Firebase

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  In your project, go to **Project settings** > **General**.
3.  Under "Your apps", click the Web icon (`</>`) to add a new web app.
4.  Give it a nickname and click "Register app".
5.  Copy the `firebaseConfig` object. You will need these values for your environment variables.
6.  Go to **Build** > **Firestore Database** and create a database. Start in **test mode** for initial setup, but be sure to secure it with the provided `firestore.rules` later.

### 5. Set up Environment Variables

Create a `.env` file in the root of the project by copying the example file (if one exists) or creating a new one.

```bash
touch .env
```

Now, open `.env` and fill in the values:

- **Threads API Credentials**:
  - `THREADS_API_BASE`: The base URL for the Threads API (e.g., `https://graph.threads.net/v1.0`).
  - `THREADS_USER_ID`: The User ID of the Threads account to monitor (e.g., `nykacity`).
  - `THREADS_ACCESS_TOKEN`: Your long-lived Threads User Access Token.
- **Firebase Configuration**:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`: From your Firebase project's web app config.
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: From your Firebase project's web app config.
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: From your Firebase project's web app config.
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: From your Firebase project's web app config.
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: From your Firebase project's web app config.
  - `NEXT_PUBLIC_FIREBASE_APP_ID`: From your Firebase project's web app config.
- **Gemini API Key**:
  - `GEMINI_API_KEY`: Your API key for the Gemini API from the Google AI Studio.

### 6. Verify Threads API Credentials (Optional)

You can use the provided Python script to check if your Threads API credentials are working correctly.

First, install the required Python packages:
```bash
pip install -r requirements.txt
```

Then, run the script:
```bash
python check_threads_api.py
```
You should see a "API Check Successful" message if your credentials in the `.env` file are correct.

### 7. Run the development server

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## Deployment

This Next.js app is configured to be deployed to [Firebase App Hosting](https://firebase.google.com/docs/app-hosting).

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase in your project

```bash
firebase init apphosting
```
When prompted, select the Firebase project you created earlier.

### 3. Deploy the application

```bash
firebase deploy --only apphosting
```

This command will build your Next.js application and deploy it to Firebase App Hosting.

### 4. Deploy Firestore Rules

To deploy the security rules and indexes for Firestore, run:

```bash
firebase deploy --only firestore
```

**Note on Firestore Indexes**: The `firestore.indexes.json` file contains recommended indexes. You may need to create additional composite indexes depending on your querying needs. The Firebase CLI will often provide a link to create required indexes automatically if a query fails due to a missing index.
