
import type { Timestamp, GeoPoint } from 'firebase/firestore';

export interface Thread {
  id: string;
  username: string;
  text: string;
  media_type: 'IMAGE' | 'VIDEO' | null;
  media_url: string | null;
  timestamp: Timestamp;
  location_name: string | null;
  location_coordinates: GeoPoint | null;
  issueId: string | null;
  replied: boolean;
  raw: Record<string, any>;
}

export interface Issue {
  issueId: string;
  category: IssueCategory;
  type: string;
  title: string;
  description: string;
  imageUrls: string[];
  location_name: string | null;
  location_coordinates: GeoPoint | null;
  reportCount: number;
  threadIds: string[];
}

export const issueCategories = [
  "Road / Infrastructure",
  "Event / Venue / Service",
  "Miscellaneous",
] as const;

export type IssueCategory = (typeof issueCategories)[number];

export const issueTypes: Record<IssueCategory, string[]> = {
  "Road / Infrastructure": [
    "Broken streetlight", "Broken traffic light", "Pothole", "Road crack",
    "Blocked drain", "Damaged public property", "Fallen tree", "Garbage overflow",
    "Graffiti", "Poor road signage", "Water leak", "Abandoned vehicle",
  ],
  "Event / Venue / Service": [
    "Long event lines", "Poor Wi-Fi", "No washroom access", "Crowd congestion",
    "No parking", "Accessibility issue", "Unhappy attendees", "Poor customer service",
    "Dirty venue", "Noise complaint", "Safety concern", "Lost and found", "Food quality issue",
  ],
  "Miscellaneous": [
    "General Inquiry", "Feedback", "Other",
  ]
};
