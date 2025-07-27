# **App Name**: Nyka Thread Tracker

## Core Features:

- Fetch Threads Mentions: Connect to the Threads API to fetch mentions of @nykacity, persisting the raw data into Firestore.
- AI-Powered Issue Clustering: Use the Gemini tool to cluster new threads into existing issues based on textual and location similarity.
- Automatic Issue Creation: Automatically create new issues when threads do not match any existing issues.
- Thread-Issue Linking: Link threads to corresponding issues in Firestore.
- Automatic Replies to Thread Mentions: Backend support to POST thank you messages on new reported threads.
- Real-time Data Presentation: Display threads and issues in a live table format, filterable by category and type.
- Admin Dashboard: Admin console to refresh data and monitor the state of all the fetched issues.

## Style Guidelines:

- Primary color: Google Blue (#4285F4) for a familiar and trusted feel, reflecting Google's branding.
- Background color: Light gray (#F1F3F4), providing a neutral backdrop that ensures readability and focuses user attention on the content. This is a desaturated version of the primary hue.
- Accent color: Google Green (#34A853), used for highlights, actionable items, and to indicate success or positive actions.
- Font pairing: 'Inter' (sans-serif) for both headlines and body text, ensuring readability and a modern aesthetic throughout the application. Note: currently only Google Fonts are supported.
- Use recognizable icons that fit into the Google Material Design theme, related to issue categories (e.g., road signs for infrastructure issues).
- Emphasize a clean, tabular layout for the admin panel to showcase threads and problems in a format which can be understood easily.
- Subtle transition animations for loading states and when refreshing data in the table.