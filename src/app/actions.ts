
'use server';

import {
  collection,
  doc,
  getDoc,
  writeBatch,
  Timestamp,
  GeoPoint,
  arrayUnion,
  increment,
  runTransaction,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { clusterWithGemini } from '@/ai/flows/cluster-threads';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Thread, Issue, IssueCategory } from '@/lib/types';
import { issueCategories, issueTypes } from '@/lib/types';

const NewIssueDetailsSchema = z.object({
  category: z.enum(issueCategories),
  type: z.string(),
  title: z.string().max(100),
  description: z.string().max(500),
});

const generateIssueDetailsPrompt = ai.definePrompt({
  name: 'generateIssueDetailsPrompt',
  input: { schema: z.object({ text: z.string(), media_url: z.string().nullable(), location_name: z.string().nullable() }) },
  output: { schema: NewIssueDetailsSchema },
  prompt: `You are an intelligent issue classification assistant for a city management service. Your task is to analyze a citizen's report and classify it into the appropriate category and type, then generate a concise title and a detailed summary.

**Classification Guidelines:**

1.  **Analyze the Report:** Carefully read the user's report text. Choose the most fitting category and type from the options provided below. For example, a report about "no internet" should be classified under "Event / Venue / Service" with the type "Poor Wi-Fi". A report about a "broken light" should be "Road / Infrastructure" and "Broken streetlight".
2.  **Categorize:** Choose the most fitting category from the available options. If the report doesn't clearly fit any specific category, use "Miscellaneous".
3.  **Select Type:** Based on the chosen category, select the most specific type of issue. If no specific type matches, choose the most general or relevant one from the list for that category.
4.  **Generate Title:** Create a short, descriptive title (max 100 characters) that summarizes the core problem.
5.  **Generate Description:** Write a clear, detailed description (max 500 characters) of the user's report.

**Available Categories and Types:**
\`\`\`json
${JSON.stringify(issueTypes, null, 2)}
\`\`\`

**Response Format:**
Your response MUST be a valid JSON object matching this schema: ${JSON.stringify(NewIssueDetailsSchema.shape)}.
Ensure the 'type' you select is valid for the 'category' you choose.

**User Report Details:**
*   **Text:** \`\`\`{{{text}}}\`\`\`
*   **Media URL:** {{{media_url}}}
*   **Location Name:** {{{location_name}}}
`,
});

async function getThreadsAPICredentials() {
  const THREADS_API_BASE = 'https://graph.threads.net/v1.0';
  const THREADS_USER_ID = '24436389089330790';
  const THREADS_ACCESS_TOKEN = 'THAAK3DaGIfWNBUVFXQVJKWGtBTVk4VkNmamtpczhEVjVrSW1xR2RjNklHMC1XM2xpVjQ4NG1qSmRUTjNESGpRNnU5ZA3ZA2MTV4ejR3c0Y3TC0yUm05NVlFVkM1cC1oYWFKWDN1ZAHc4V19kRnZAJMXBRb00ydnF4WHJxcEN2dlZAheE1kR2lLa19jUVoxZA1ByWkEZD';

  if (!THREADS_API_BASE || !THREADS_USER_ID || !THREADS_ACCESS_TOKEN) {
    throw new Error('Threads API credentials are not configured in .env.local.');
  }
  return { THREADS_API_BASE, THREADS_USER_ID, THREADS_ACCESS_TOKEN };
}


export async function fetchAndProcessThreads(autoReply: boolean = false): Promise<{ processed: number; error?: string }> {
  if (!db || !db.app || !db.app.options || !db.app.options.apiKey) {
    const errorMessage = 'Firebase is not properly configured. Please check your .env.local file.';
    console.error(errorMessage);
    return { processed: 0, error: errorMessage };
  }
  
  try {
    const { THREADS_API_BASE, THREADS_USER_ID, THREADS_ACCESS_TOKEN } = await getThreadsAPICredentials();
    const mentionsUrl = `${THREADS_API_BASE}/${THREADS_USER_ID}/mentions?fields=id&access_token=${THREADS_ACCESS_TOKEN}`;
    console.log('Fetching mentions from URL...');
    
    const mentionsResponse = await fetch(mentionsUrl);
    if (!mentionsResponse.ok) {
        const errorText = await mentionsResponse.text();
        console.error('Failed to fetch mentions:', errorText);
        return { processed: 0, error: `Failed to fetch mentions. API said: ${errorText}` };
    }

    const responseData = await mentionsResponse.json();
    const mentions = responseData.data;
    
    if (!mentions || !Array.isArray(mentions) || mentions.length === 0) {
      console.log('API returned no new mentions.');
      return { processed: 0, error: 'No new mentions found.' };
    }
    
    const mentionIds: string[] = mentions.map((mention: any) => mention.id);
    console.log(`Found ${mentionIds.length} mentions from API:`, mentionIds);

    const processingPromises: Promise<void>[] = [];
    let processedCount = 0;

    for (const threadId of mentionIds) {
      const threadRef = doc(db, 'threads', threadId);
      const threadDoc = await getDoc(threadRef);

      if (threadDoc.exists()) {
        console.log(`[${threadId}] Thread already exists in Firestore. Skipping.`);
        continue;
      }
      processedCount++;
      console.log(`[${threadId}] New thread. Fetching its content...`);

      const promise = (async () => {
        try {
          const threadUrl = `${THREADS_API_BASE}/${threadId}?fields=id,text,media_type,media_url,timestamp,username,location&access_token=${THREADS_ACCESS_TOKEN}`;
          const threadResponse = await fetch(threadUrl);

          if (!threadResponse.ok) {
            const errorText = await threadResponse.text();
            console.warn(`[${threadId}] Failed to fetch full data: ${errorText}. Skipping.`);
            return; 
          }

          const threadData = await threadResponse.json();
          console.log(`[${threadId}] Successfully fetched data from API:`, threadData);
          
          const locationData = threadData.location;
          const locationName = locationData?.name || null;
          const coordinates = locationData?.coordinates || null;
          
          const mediaType = threadData.media_type;

          const newThread: Thread = {
            id: threadData.id,
            username: threadData.username,
            text: threadData.text,
            media_type: (mediaType === 'IMAGE' || mediaType === 'VIDEO') ? mediaType : null,
            media_url: threadData.media_url || null,
            timestamp: Timestamp.fromDate(new Date(threadData.timestamp)),
            location_name: locationName,
            location_coordinates: coordinates ? new GeoPoint(coordinates.latitude, coordinates.longitude) : null,
            issueId: null,
            replied: false,
            raw: threadData,
          };
          
          const { id, ...threadDocForSave } = newThread;
          
          await setDoc(doc(db, 'threads', id), threadDocForSave);
          console.log(`[${id}] Successfully saved new thread to Firestore.`);
          
          const assignedIssueId = await processNewThread(newThread);
          if (autoReply && assignedIssueId) {
              console.log(`[${id}] Auto-replying for issue ${assignedIssueId}`);
              await sendReplyForThread(id, assignedIssueId);
          }

        } catch (error) {
          console.error(`[${threadId}] Error processing thread:`, error);
        }
      })();
      processingPromises.push(promise);
    }
    
    await Promise.all(processingPromises);

    if (processedCount > 0) {
        console.log(`Successfully processed ${processedCount} new mentions.`);
    } else {
        console.log('All fetched mentions already existed in the database. No new threads to process.');
    }

    return { processed: processedCount };
  } catch (error) {
    console.error('Error in fetchAndProcessThreads:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { processed: 0, error: `An unexpected error occurred: ${errorMessage}` };
  }
}

export async function reprocessThreads(): Promise<{ processed: number; error?: string }> {
  try {
    const q = query(collection(db, 'threads'), where('issueId', '==', null));
    const threadsSnapshot = await getDocs(q);
    
    if (threadsSnapshot.empty) {
      return { processed: 0, error: "No unprocessed threads found to reprocess." };
    }

    const threadsToProcess: Thread[] = threadsSnapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            username: data.username,
            text: data.text,
            media_type: data.media_type,
            media_url: data.media_url,
            timestamp: data.timestamp,
            location_name: data.location_name,
            location_coordinates: data.location_coordinates,
            issueId: data.issueId,
            replied: data.replied,
            raw: data.raw,
        } as Thread;
    });
    console.log(`Found ${threadsToProcess.length} unprocessed threads. Reprocessing...`);
    
    const processingPromises = threadsToProcess.map(thread => processNewThread(thread));
    await Promise.all(processingPromises);

    return { processed: threadsToProcess.length };
  } catch (error) {
    console.error('Error in reprocessThreads:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { processed: 0, error: `An unexpected error occurred: ${errorMessage}` };
  }
}

export async function reprocessAllThreads(): Promise<{ processed: number; error?: string }> {
  try {
    console.log('Starting full reprocess of all threads...');

    // Step 1: Detach all threads from issues and reset reply status
    const allThreadsSnapshot = await getDocs(collection(db, 'threads'));
    const updateBatch = writeBatch(db);
    allThreadsSnapshot.docs.forEach(doc => {
      updateBatch.update(doc.ref, { issueId: null, replied: false });
    });
    await updateBatch.commit();
    console.log(`Detached and reset reply status for ${allThreadsSnapshot.size} threads.`);

    // Step 2: Delete all existing issues
    const allIssuesSnapshot = await getDocs(collection(db, 'issues'));
    const deleteBatch = writeBatch(db);
    allIssuesSnapshot.docs.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log(`Deleted ${allIssuesSnapshot.size} existing issues.`);
    
    // Reset the issues counter
    const issuesCounterRef = doc(db, 'internal', 'issuesCounter');
    await setDoc(issuesCounterRef, { count: 0 });
    console.log('Reset issues counter.');


    // Step 3: Reprocess all threads
    const threadsToProcess: Thread[] = allThreadsSnapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            username: data.username,
            text: data.text,
            media_type: data.media_type,
            media_url: data.media_url,
            timestamp: data.timestamp, // Firestore Timestamp object
            location_name: data.location_name,
            location_coordinates: data.location_coordinates,
            issueId: null, // Explicitly set to null
            replied: false, // Explicitly set to false
            raw: data.raw,
        } as Thread;
    });
    console.log(`Reprocessing all ${threadsToProcess.length} threads...`);
    
    // Process threads sequentially to ensure correct clustering
    for (const thread of threadsToProcess) {
      await processNewThread(thread);
    }

    console.log('Full reprocess complete.');
    return { processed: threadsToProcess.length };
  } catch (error)
{
    console.error('Error in reprocessAllThreads:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { processed: 0, error: `An unexpected error occurred: ${errorMessage}` };
  }
}

async function findOrCreateHardcodedIssue(thread: Thread, title: string, keywords: string[]): Promise<string | null> {
    const threadText = thread.text.toLowerCase();
    if (!keywords.some(kw => threadText.includes(kw))) {
        return null; // Not a match for this hardcoded issue
    }

    const issuesRef = collection(db, 'issues');
    const q = query(issuesRef, where("title", "==", title));
    const querySnapshot = await getDocs(q);

    let issueId: string;

    if (!querySnapshot.empty) {
        // Issue already exists, use its ID
        const existingIssue = querySnapshot.docs[0];
        issueId = existingIssue.id;
        console.log(`[${thread.id}] Matched hardcoded issue '${title}' with existing ID ${issueId}.`);
        await updateExistingIssue(issueId, thread);
    } else {
        // Issue does not exist, create it
        console.log(`[${thread.id}] Matched hardcoded issue '${title}'. Creating new issue.`);
        issueId = await createNewIssueForThread(thread, title);
    }
    
    return issueId;
}


async function processNewThread(newThread: Thread): Promise<string | null> {
    
  // Hardcoded rule for "Broken Light" issues
  const brokenLightIssueId = await findOrCreateHardcodedIssue(
    newThread, 
    "Broken Streetlight Reports", 
    ["broken light", "street light", "fix broken lights"]
  );

  if (brokenLightIssueId) {
    console.log(`[${newThread.id}] Assigning hardcoded issue ${brokenLightIssueId} to thread.`);
    const threadRef = doc(db, 'threads', newThread.id);
    await updateDoc(threadRef, { issueId: brokenLightIssueId });
    return brokenLightIssueId;
  }
    
  console.log(`[${newThread.id}] Starting AI processing...`);
  const issuesSnapshot = await getDocs(collection(db, 'issues'));
  
  // Create a simplified version of issues for the AI to process.
  const simplifiedIssues = issuesSnapshot.docs.map(d => {
    const data = d.data();
    return {
      issueId: d.id,
      title: data.title,
      description: data.description,
    };
  });

  console.log(`[${newThread.id}] Clustering against ${simplifiedIssues.length} existing issues.`);

  const plainNewThread = {
    ...newThread,
    timestamp: newThread.timestamp instanceof Timestamp ? newThread.timestamp.toDate().toISOString() : String(newThread.timestamp),
    location_coordinates: newThread.location_coordinates
      ? { latitude: newThread.location_coordinates.latitude, longitude: newThread.location_coordinates.longitude }
      : null
  };

  const clusterResult = await clusterWithGemini({
    newThread: plainNewThread,
    existingIssues: simplifiedIssues,
  });

  let assignedIssueId: string;
  console.log(`[${newThread.id}] Clustering result: ${clusterResult}`);

  if (clusterResult === 'NEW' || !clusterResult) {
    assignedIssueId = await createNewIssueForThread(newThread);
    console.log(`[${newThread.id}] Created new issue: ${assignedIssueId}`);
  } else {
    assignedIssueId = await updateExistingIssue(clusterResult, newThread);
    console.log(`[${newThread.id}] Updated existing issue: ${assignedIssueId}`);
  }

  if (assignedIssueId) {
    console.log(`[${newThread.id}] Assigning issue ${assignedIssueId} to thread.`);
    const threadRef = doc(db, 'threads', newThread.id);
    await updateDoc(threadRef, { issueId: assignedIssueId });
    return assignedIssueId;
  }
  return null;
}

async function createNewIssueForThread(thread: Thread, overrideTitle?: string): Promise<string> {
    console.log(`[${thread.id}] Generating new issue details with AI...`);
    const { output } = await generateIssueDetailsPrompt({ text: thread.text, media_url: thread.media_url, location_name: thread.location_name });
    if (!output) {
        const errorMsg = `[${thread.id}] Failed to generate issue details from AI.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    let newIssueDetails = output;
    
    // Override title if provided (for hardcoded issues)
    if (overrideTitle) {
        newIssueDetails.title = overrideTitle;
    }

    const validTypes = issueTypes[newIssueDetails.category as IssueCategory] || [];
    if (!validTypes.includes(newIssueDetails.type)) {
        console.warn(`[${thread.id}] AI returned invalid type "${newIssueDetails.type}" for category "${newIssueDetails.category}". Defaulting to "${validTypes[0]}".`);
        newIssueDetails.type = validTypes[0];
    }
    
    return await runTransaction(db, async (transaction) => {
        const issuesCounterRef = doc(db, 'internal', 'issuesCounter');
        const counterDoc = await transaction.get(issuesCounterRef);
        
        let newCount = 1;
        if (counterDoc.exists()) {
            newCount = (counterDoc.data()?.count || 0) + 1;
        }

        const newIssueId = `ISSUE-${String(newCount).padStart(4, '0')}`;

        console.log(`[${thread.id}] Creating new issue ${newIssueId}.`);

        const newIssue: Omit<Issue, 'issueId'> = {
            category: newIssueDetails.category,
            type: newIssueDetails.type,
            title: newIssueDetails.title,
            description: newIssueDetails.description,
            imageUrls: thread.media_url ? [thread.media_url] : [],
            location_name: thread.location_name,
            location_coordinates: thread.location_coordinates,
            reportCount: 1,
            threadIds: [thread.id],
        };

        transaction.set(doc(db, 'issues', newIssueId), newIssue);
        transaction.set(issuesCounterRef, { count: newCount }, { merge: true });
        
        console.log(`[${thread.id}] Successfully created issue ${newIssueId} in transaction.`);
        return newIssueId;
    });
}

async function updateExistingIssue(issueId: string, thread: Thread): Promise<string> {
    console.log(`[${thread.id}] Updating existing issue ${issueId}.`);
    const issueRef = doc(db, 'issues', issueId);
    
    const batch = writeBatch(db);
    const updateData: any = {
        reportCount: increment(1),
        threadIds: arrayUnion(thread.id),
    };

    if (thread.media_url && thread.media_url.trim() !== '') {
        updateData.imageUrls = arrayUnion(thread.media_url);
    }
    batch.update(issueRef, updateData);
    await batch.commit();
    console.log(`[${thread.id}] Successfully updated issue ${issueId}.`);
    return issueId;
}

export async function sendReplyForThread(threadId: string, issueId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await replyToThread(threadId, issueId);
    if (success) {
      const threadRef = doc(db, 'threads', threadId);
      await updateDoc(threadRef, { replied: true });
      return { success: true };
    }
    return { success: false, error: 'Failed to send reply via API.' };
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error(`[${threadId}] Error in sendReplyForThread:`, message);
      return { success: false, error: message };
  }
}

async function replyToThread(threadId: string, issueId: string): Promise<boolean> {
  const { THREADS_API_BASE, THREADS_ACCESS_TOKEN } = await getThreadsAPICredentials();
  const THREADS_USER_ID = '24436389089330790';
  const text = `Thank you for your report! We're tracking this as issue ID: ${issueId}. Your contribution helps improve our city.`;

  try {
    // Step 1: Create the reply to get a creation_id
    const createReplyUrl = `${THREADS_API_BASE}/${THREADS_USER_ID}/threads`;
    console.log(`[${threadId}] Step 1: Creating reply content...`);
    
    const createParams = new URLSearchParams({
        media_type: 'TEXT',
        reply_to_id: threadId,
        text: text,
        access_token: THREADS_ACCESS_TOKEN
    });

    const createResponse = await fetch(createReplyUrl, {
      method: 'POST',
      body: createParams,
    });
    
    const createData = await createResponse.json();

    if (!createResponse.ok) {
      const errorMessage = createData.error?.message || 'Unknown error during reply creation.';
      console.error(`[${threadId}] Failed to create reply content:`, errorMessage, createData);
      return false;
    }
    
    const creationId = createData.id;
    if (!creationId) {
        console.error(`[${threadId}] Failed to get creation_id from reply creation response.`, createData);
        return false;
    }
    console.log(`[${threadId}] Step 1 successful. Got creation_id: ${creationId}`);

    // Step 2: Publish the reply using the creation_id
    const publishUrl = `${THREADS_API_BASE}/${THREADS_USER_ID}/threads_publish`;
    console.log(`[${threadId}] Step 2: Publishing reply with creation_id ${creationId}...`);

    const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: THREADS_ACCESS_TOKEN
    });

    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      body: publishParams
    });
    
    if (!publishResponse.ok) {
        const publishErrorData = await publishResponse.json();
        const errorMessage = publishErrorData.error?.message || 'Unknown error during reply publication.';
        console.error(`[${threadId}] Failed to publish reply:`, errorMessage, publishErrorData);
        return false;
    }

    console.log(`[${threadId}] Successfully published reply for issue ${issueId}.`);
    return true;

  } catch (error) {
    console.error(`[${threadId}] Exception caught in replyToThread:`, error);
    return false;
  }
}
