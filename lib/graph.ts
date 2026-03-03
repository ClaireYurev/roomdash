// Microsoft Graph API client (optional — for Outlook calendar)
// Leave GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET blank to disable.

interface GraphToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  organizer?: { emailAddress: { name: string; address: string } };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GraphToken;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

export async function getTodayEvents(
  roomEmail: string
): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  ).toISOString();

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/calendarView?startDateTime=${startOfDay}&endDateTime=${endOfDay}&$select=id,subject,start,end,organizer&$orderby=start/dateTime`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.value as CalendarEvent[]) || [];
  } catch {
    return [];
  }
}

export function isGraphConfigured(): boolean {
  return !!(
    process.env.GRAPH_TENANT_ID &&
    process.env.GRAPH_CLIENT_ID &&
    process.env.GRAPH_CLIENT_SECRET
  );
}
