
"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Issue } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "./icons";

interface IssuesTableProps {
  issues: Issue[];
  loading: boolean;
}

export function IssuesTable({ issues, loading }: IssuesTableProps) {
  const renderSkeleton = () => (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-20 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-40 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-full rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-12 rounded-md" />
      </TableCell>
    </TableRow>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issues</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Issue ID</TableHead>
                <TableHead className="w-[250px]">Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[120px] text-center">Reports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              ) : issues.length > 0 ? (
                issues.map((issue) => (
                  <TableRow key={issue.issueId}>
                    <TableCell className="font-medium">{issue.issueId}</TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                        {issue.category === "Road / Infrastructure" ? <Icons.road className="h-4 w-4 text-muted-foreground" /> : <Icons.venue className="h-4 w-4 text-muted-foreground" />}
                        <span>{issue.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{issue.title}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{issue.reportCount}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No issues found.
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
