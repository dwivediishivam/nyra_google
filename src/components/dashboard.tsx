
"use client";

import * as React from "react";
import { collection, onSnapshot, query, where, orderBy, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Issue, Thread } from "@/lib/types";
import { Header } from "@/components/header";
import { IssuesTable } from "@/components/issues-table";
import { ThreadsTable } from "@/components/threads-table";
import { IssueFilters } from "@/components/issue-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const firebaseConfigured = !!db.app;

// Helper function to convert Firestore data to plain objects
const mapDocToThread = (doc: DocumentData): Thread => {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    timestamp: data.timestamp, // Keep as Firestore Timestamp
    // GeoPoint is fine as is for the client if not serialized over network boundaries
    location_coordinates: data.location_coordinates, 
  } as Thread;
};

const mapDocToIssue = (doc: DocumentData): Issue => {
  const data = doc.data();
  return {
    ...data,
    issueId: doc.id,
  } as Issue;
};


export default function Dashboard() {
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedType, setSelectedType] = React.useState("all");

  React.useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const threadsQuery = query(collection(db, "threads"), orderBy("timestamp", "desc"));
    const unsubscribeThreads = onSnapshot(threadsQuery, (snapshot) => {
      const threadsData = snapshot.docs.map(mapDocToThread);
      setThreads(threadsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching threads:", error);
      setLoading(false);
    });

    return () => unsubscribeThreads();
  }, []);

  React.useEffect(() => {
    if (!firebaseConfigured) return;
    
    let issuesQuery = query(collection(db, "issues"), orderBy("reportCount", "desc"));

    if (selectedCategory !== "all") {
      issuesQuery = query(issuesQuery, where("category", "==", selectedCategory));
    }
    if (selectedType !== "all") {
      issuesQuery = query(issuesQuery, where("type", "==", selectedType));
    }

    const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
      const issuesData = snapshot.docs.map(mapDocToIssue);
      setIssues(issuesData);
    }, (error) => {
      console.error("Error fetching issues:", error);
    });

    return () => unsubscribeIssues();
  }, [selectedCategory, selectedType]);

  if (!firebaseConfigured) {
    return (
      <>
        <Header />
        <main className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Needed</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Firebase is not configured. Please set up your environment variables in a 
                <code className="p-1 bg-muted rounded-sm">.env.local</code> file to connect to your Firebase project.
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
        <div className="space-y-6">
          <div className="space-y-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">Issues Overview</h2>
                <IssueFilters
                    selectedCategory={selectedCategory}
                    selectedType={selectedType}
                    onCategoryChange={setSelectedCategory}
                    onTypeChange={setSelectedType}
                />
            </div>
            <IssuesTable issues={issues} loading={loading && issues.length === 0} />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Recent Activity</h2>
            <ThreadsTable threads={threads} loading={loading && threads.length === 0} />
          </div>
        </div>
      </main>
    </>
  );
}
