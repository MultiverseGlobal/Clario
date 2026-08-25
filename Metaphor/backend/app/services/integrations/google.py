import logging
import httpx

logger = logging.getLogger(__name__)

async def fetch_google_workspace(access_token: str) -> str:
    """
    Fetches recent Calendar events and Gmail messages using a Google OAuth Access Token.
    """
    if not access_token:
        return "Failed to fetch Google Workspace: No access token provided."
        
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        content_summary = "--- Google Workspace Snapshot ---\n\n"
        
        async with httpx.AsyncClient() as client:
            # 1. Fetch Calendar Events
            cal_response = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers=headers,
                params={
                    "maxResults": 5,
                    "orderBy": "updated",
                    "singleEvents": "true",
                    "showDeleted": "false"
                },
                timeout=10.0
            )
            
            if cal_response.status_code == 200:
                events = cal_response.json().get("items", [])
                content_summary += "## Recent Calendar Events:\n"
                if not events:
                    content_summary += "No recent events found.\n"
                for ev in events:
                    title = ev.get("summary", "Untitled Event")
                    start = ev.get("start", {}).get("dateTime", ev.get("start", {}).get("date", "Unknown"))
                    attendees = [a.get("email") for a in ev.get("attendees", []) if a.get("email")]
                    content_summary += f"- {title} (Time: {start})\n  Attendees: {', '.join(attendees) if attendees else 'None'}\n"
            else:
                logger.error(f"Google Calendar API error: {cal_response.text}")
                content_summary += f"Failed to fetch Calendar: HTTP {cal_response.status_code}\n"
                
            content_summary += "\n"
            
            # 2. Fetch Gmail Messages (Metadata only)
            gmail_response = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers=headers,
                params={
                    "maxResults": 5,
                    "q": "is:unread OR label:inbox"
                },
                timeout=10.0
            )
            
            if gmail_response.status_code == 200:
                messages = gmail_response.json().get("messages", [])
                content_summary += "## Recent Emails:\n"
                if not messages:
                    content_summary += "No recent emails found.\n"
                    
                for msg_ref in messages:
                    msg_id = msg_ref.get("id")
                    if msg_id:
                        msg_detail = await client.get(
                            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}",
                            headers=headers,
                            params={"format": "metadata", "metadataHeaders": "Subject,From"},
                            timeout=10.0
                        )
                        if msg_detail.status_code == 200:
                            headers_list = msg_detail.json().get("payload", {}).get("headers", [])
                            subject = next((h.get("value") for h in headers_list if h.get("name") == "Subject"), "No Subject")
                            sender = next((h.get("value") for h in headers_list if h.get("name") == "From"), "Unknown Sender")
                            snippet = msg_detail.json().get("snippet", "")
                            content_summary += f"- From: {sender}\n  Subject: {subject}\n  Snippet: {snippet}...\n"
            else:
                logger.error(f"Gmail API error: {gmail_response.text}")
                content_summary += f"Failed to fetch Gmail: HTTP {gmail_response.status_code}\n"
                
            return content_summary
            
    except Exception as e:
        logger.error(f"Error fetching from Google Workspace: {e}")
        return f"Failed to fetch Google Workspace: {str(e)}"
