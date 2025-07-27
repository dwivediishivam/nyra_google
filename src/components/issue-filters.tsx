"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { issueCategories, issueTypes, type IssueCategory } from "@/lib/types";

interface IssueFiltersProps {
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
  selectedCategory: string;
  selectedType: string;
}

export function IssueFilters({
  onCategoryChange,
  onTypeChange,
  selectedCategory,
  selectedType,
}: IssueFiltersProps) {
  const handleCategoryChange = (value: string) => {
    onCategoryChange(value);
    onTypeChange("all"); // Reset type when category changes
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Select onValueChange={handleCategoryChange} value={selectedCategory}>
        <SelectTrigger className="w-full sm:w-[240px]">
          <SelectValue placeholder="Filter by category..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {issueCategories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        onValueChange={onTypeChange}
        value={selectedType}
        disabled={!selectedCategory || selectedCategory === "all"}
      >
        <SelectTrigger className="w-full sm:w-[240px]">
          <SelectValue placeholder="Filter by type..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {selectedCategory &&
            selectedCategory !== "all" &&
            issueTypes[selectedCategory as IssueCategory].map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
