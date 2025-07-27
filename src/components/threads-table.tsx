
"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Thread } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendReplyForThread } from "@/app/actions";

interface ThreadsTableProps {
  threads: Thread[];
  loading: boolean;
}

export function ThreadsTable({ threads, loading }: ThreadsTableProps) {
  const { toast } = useToast();
  const [replying, setReplying] = React.useState<string | null>(null);

  const handleReply = async (threadId: string, issueId: string) => {
    setReplying(threadId);
    try {
      const result = await sendReplyForThread(threadId, issueId);
      if (result.success) {
        toast({
          title: "Reply Sent",
          description: `Successfully sent reply for issue ${issueId}.`,
        });
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Reply Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setReplying(null);
    }
  };

  const renderSkeleton = () => (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-24 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-full rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28 rounded-md" />
      </TableCell>
    </TableRow>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest Mentions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">User</TableHead>
                <TableHead>Text</TableHead>
                <TableHead className="w-[150px]">Time</TableHead>
                <TableHead className="w-[120px]">Issue ID</TableHead>
                <TableHead className="w-[150px]">Reply Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                  {renderSkeleton()}
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              ) : threads.length > 0 ? (
                threads.map((thread) => (
                  <TableRow key={thread.id}>
                    <TableCell className="font-medium">@{thread.username}</TableCell>
                    <TableCell className="max-w-sm truncate">{thread.text}</TableCell>
                    <TableCell>{thread.timestamp.toDate ? formatDistanceToNow(thread.timestamp.toDate(), { addSuffix: true }) : 'Invalid date'}</TableCell>
                    <TableCell>
                      {thread.issueId ? (
                        <Badge>{thread.issueId}</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {thread.issueId && !thread.replied && (
                         <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleReply(thread.id, thread.issueId!)}
                          disabled={replying === thread.id}
                        >
                           <Send className="mr-2 h-4 w-4" />
                           {replying === thread.id ? "Sending..." : "Send Reply"}
                         </Button>
                      )}
                      {thread.replied && (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          <span>Replied</span>
                        </div>
                      )}
                       {!thread.issueId && (
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="mr-2 h-4 w-4" />
                          <span>Pending</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No threads found. Click "Refresh Records" to fetch mentions.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
