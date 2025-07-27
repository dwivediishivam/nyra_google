
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { RefreshCw, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchAndProcessThreads, reprocessThreads, reprocessAllThreads } from "@/app/actions";

export function Header() {
  const [isSyncing, startSyncTransition] = React.useTransition();
  const [isReprocessing, startReprocessTransition] = React.useTransition();
  const [isReprocessingAll, startReprocessAllTransition] = React.useTransition();
  const [isReplying, startReplyingTransition] = React.useTransition();
  const { toast } = useToast();

  const handleSync = () => {
    startSyncTransition(async () => {
      try {
        const result = await fetchAndProcessThreads(false);
        if (result.error) {
          throw new Error(result.error);
        }
        toast({
          title: "Sync Complete",
          description: `${result.processed} new mentions processed.`,
        });
      } catch (error) {
        console.error("Sync failed:", error);
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
      }
    });
  };

  const handleReprocess = () => {
    startReprocessTransition(async () => {
      try {
        const result = await reprocessThreads();
        if (result.error) {
          throw new Error(result.error);
        }
        toast({
          title: "Reprocess Complete",
          description: `Reprocessed ${result.processed} threads.`,
        });
      } catch (error) {
        console.error("Reprocess failed:", error);
        toast({
          variant: "destructive",
          title: "Reprocess Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
      }
    });
  };
  
  const handleReprocessAll = () => {
    startReprocessAllTransition(async () => {
      try {
        const result = await reprocessAllThreads();
        if (result.error) {
          throw new Error(result.error);
        }
        toast({
          title: "Full Reprocess Complete",
          description: `Reprocessed all ${result.processed} threads.`,
        });
      } catch (error) {
        console.error("Full Reprocess failed:", error);
        toast({
          variant: "destructive",
          title: "Full Reprocess Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
      }
    });
  };

  const handleFetchAndReply = () => {
    startReplyingTransition(async () => {
      try {
        const result = await fetchAndProcessThreads(true);
        if (result.error) {
          throw new Error(result.error);
        }
        toast({
          title: "Fetch and Reply Complete",
          description: `${result.processed} new mentions processed and replied to.`,
        });
      } catch (error) {
        console.error("Fetch and Reply failed:", error);
        toast({
          variant: "destructive",
          title: "Fetch and Reply Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
      }
    });
  };

  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center">
          <Icons.logo className="h-6 w-6 mr-2" />
          <h1 className="text-lg font-semibold tracking-tight">
            Nyra Thread Tracker
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
           <Button onClick={handleReprocessAll} disabled={isReprocessingAll} variant="destructive">
            <Trash2
              className={`mr-2 h-4 w-4 ${isReprocessingAll ? "animate-spin" : ""}`}
            />
            {isReprocessingAll ? "Reprocessing..." : "Reprocess All Issues"}
          </Button>
           <Button onClick={handleReprocess} disabled={isReprocessing} variant="outline">
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isReprocessing ? "animate-spin" : ""}`}
            />
            {isReprocessing ? "Reprocessing..." : "Reprocess Unassigned"}
          </Button>
          <Button onClick={handleSync} disabled={isSyncing} variant="outline">
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Refreshing..." : "Refresh Records"}
          </Button>
          <Button onClick={handleFetchAndReply} disabled={isReplying}>
            <Send
              className={`mr-2 h-4 w-4 ${isReplying ? "animate-spin" : ""}`}
            />
            {isReplying ? "Replying..." : "Fetch and Reply"}
          </Button>
        </div>
      </div>
    </header>
  );
}
