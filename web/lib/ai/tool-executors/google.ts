import type { ToolExecutor } from "./types";

export const googleExecutors: Record<string, ToolExecutor> = {
  // --- Drive ---
  google_drive_list_files: async (args) => {
    const params = new URLSearchParams();
    if (args.query) params.set("query", String(args.query));
    if (args.folderId) params.set("folderId", String(args.folderId));
    if (args.mimeType) params.set("mimeType", String(args.mimeType));
    if (args.pageSize) params.set("pageSize", String(args.pageSize));
    const res = await fetch(`/api/integrations/google/drive?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Drive list failed");
    return {
      output: `Found ${data.files?.length || 0} files:\n${JSON.stringify(data.files, null, 2)}`,
    };
  },

  google_drive_get_file: async (args) => {
    const res = await fetch(
      `/api/integrations/google/drive/${encodeURIComponent(args.fileId)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Drive get failed");
    return { output: JSON.stringify(data, null, 2) };
  },

  google_drive_search: async (args) => {
    const params = new URLSearchParams({
      query: `fullText contains '${String(args.query).replace(/'/g, "\\'")}'`,
    });
    if (args.pageSize) params.set("pageSize", String(args.pageSize));
    const res = await fetch(`/api/integrations/google/drive?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Drive search failed");
    return {
      output: `Found ${data.files?.length || 0} files:\n${JSON.stringify(data.files, null, 2)}`,
    };
  },

  google_drive_create_file: async (args) => {
    const res = await fetch("/api/integrations/google/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Drive create failed");
    return {
      output: `Created file: ${data.name}\nID: ${data.id}\nLink: ${data.webViewLink || "N/A"}`,
    };
  },

  // --- Gmail ---
  google_gmail_list_messages: async (args) => {
    const params = new URLSearchParams();
    if (args.query) params.set("query", String(args.query));
    if (args.maxResults) params.set("maxResults", String(args.maxResults));
    if (args.labelIds) params.set("labelIds", args.labelIds.join(","));
    const res = await fetch(`/api/integrations/google/gmail?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gmail list failed");
    const messages = (data.messages || []).map((m: any) => ({
      id: m.id,
      from: m.from,
      subject: m.subject,
      date: m.date,
      snippet: m.snippet,
      labels: m.labelIds?.join(", "),
    }));
    return {
      output: `Found ${messages.length} messages:\n${JSON.stringify(messages, null, 2)}`,
    };
  },

  google_gmail_get_message: async (args) => {
    const res = await fetch(
      `/api/integrations/google/gmail/${encodeURIComponent(args.messageId)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gmail get failed");
    return {
      output: [
        `From: ${data.from}`,
        `To: ${data.to}`,
        `Subject: ${data.subject}`,
        `Date: ${data.date}`,
        data.attachments?.length
          ? `Attachments: ${data.attachments.map((a: any) => a.filename).join(", ")}`
          : null,
        `\n${data.body}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },

  google_gmail_send: async (args) => {
    const res = await fetch("/api/integrations/google/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...args, action: "send" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gmail send failed");
    return {
      output: `Email sent to ${args.to}\nSubject: ${args.subject}\nMessage ID: ${data.id}`,
    };
  },

  google_gmail_get_thread: async (args) => {
    const res = await fetch("/api/integrations/google/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "thread", threadId: args.threadId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gmail thread fetch failed");
    const msgs = (data.messages || []).map((m: any) => ({
      id: m.id,
      from: m.from,
      to: m.to,
      subject: m.subject,
      date: m.date,
      snippet: m.snippet,
    }));
    return {
      output: `Thread ${data.id} (${msgs.length} messages):\n${JSON.stringify(msgs, null, 2)}`,
    };
  },

  google_gmail_reply: async (args) => {
    const res = await fetch("/api/integrations/google/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", ...args }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gmail reply failed");
    return {
      output: `Reply sent (${args.replyAll ? "reply-all" : "reply"})\nMessage ID: ${data.id}\nThread ID: ${data.threadId}`,
    };
  },

  google_gmail_modify: async (args) => {
    const res = await fetch("/api/integrations/google/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "modify", ...args }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gmail modify failed");
    return {
      output: `Modified message ${args.messageId}\nCurrent labels: ${(data.labelIds || []).join(", ")}`,
    };
  },

  google_gmail_create_draft: async (args) => {
    const res = await fetch("/api/integrations/google/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "draft", ...args }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gmail draft failed");
    return {
      output: `Draft created\nDraft ID: ${data.id}\nTo: ${args.to}\nSubject: ${args.subject}`,
    };
  },

  // --- Calendar ---
  google_calendar_list_events: async (args) => {
    const params = new URLSearchParams();
    if (args.calendarId) params.set("calendarId", String(args.calendarId));
    if (args.timeMin) params.set("timeMin", String(args.timeMin));
    if (args.timeMax) params.set("timeMax", String(args.timeMax));
    if (args.maxResults) params.set("maxResults", String(args.maxResults));
    const res = await fetch(`/api/integrations/google/calendar?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Calendar list failed");
    const events = (data.events || []).map((e: any) => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location,
      attendees: e.attendees?.map((a: any) => a.email).join(", "),
      link: e.htmlLink,
    }));
    return {
      output: `Found ${events.length} events:\n${JSON.stringify(events, null, 2)}`,
    };
  },

  google_calendar_get_event: async (args) => {
    const params = args.calendarId
      ? `?calendarId=${encodeURIComponent(args.calendarId)}`
      : "";
    const res = await fetch(
      `/api/integrations/google/calendar/${encodeURIComponent(args.eventId)}${params}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Calendar get failed");
    return { output: JSON.stringify(data, null, 2) };
  },

  google_calendar_create_event: async (args) => {
    const res = await fetch("/api/integrations/google/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Calendar create failed");
    return {
      output: `Created event: ${data.summary}\nWhen: ${data.start?.dateTime || data.start?.date}\nLink: ${data.htmlLink || "N/A"}`,
    };
  },

  google_calendar_update_event: async (args) => {
    const { eventId, calendarId, ...updates } = args;
    const params = calendarId
      ? `?calendarId=${encodeURIComponent(calendarId)}`
      : "";
    const res = await fetch(
      `/api/integrations/google/calendar/${encodeURIComponent(eventId)}${params}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Calendar update failed");
    return { output: `Updated event: ${data.summary}` };
  },
};
