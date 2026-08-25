import logging
import os
from typing import List, Dict, Any
from google.oauth2 import service_account
from googleapiclient.discovery import build
from app.core.config import settings

logger = logging.getLogger("metaphor.parsers.google")

class GoogleParser:
    def __init__(self):
        self.creds = None
        json_path = settings.GOOGLE_SERVICE_ACCOUNT_JSON_PATH
        if json_path and os.path.exists(json_path):
            try:
                self.creds = service_account.Credentials.from_service_account_file(
                    json_path,
                    scopes=[
                        "https://www.googleapis.com/auth/drive.readonly",
                        "https://www.googleapis.com/auth/calendar.readonly"
                    ]
                )
            except Exception as e:
                logger.error(f"Error loading Google service account file: {e}")

    async def fetch_documents(self) -> List[Dict[str, Any]]:
        """
        Fetch files from Google Drive and events from Google Calendar.
        Raises an explicit RuntimeError if credentials are not configured or fetching fails.
        """
        if not self.creds:
            logger.error("Google Drive & Calendar integration is not configured.")
            raise RuntimeError("Google Drive/Calendar integration is not configured or missing service account credentials.")

        documents = []
        try:
            # Load Drive documents
            drive_service = build("drive", "v3", credentials=self.creds)
            # Query for text documents/gdocs
            drive_results = drive_service.files().list(
                q="mimeType='application/vnd.google-apps.document' or mimeType='text/plain'",
                pageSize=5,
                fields="files(id, name, webViewLink, createdTime, modifiedTime)"
            ).execute()
            
            files = drive_results.get("files", [])
            for file in files:
                documents.append({
                    "id": file.get("id"),
                    "title": f"Google File: {file.get('name')}",
                    "content": f"Title: {file.get('name')}\nMIME: {file.get('mimeType')}",
                    "source": "google_drive",
                    "metadata": {
                        "url": file.get("webViewLink"),
                        "created_time": file.get("createdTime"),
                        "last_edited_time": file.get("modifiedTime"),
                        "type": "document"
                    }
                })

            # Load Calendar events
            calendar_service = build("calendar", "v3", credentials=self.creds)
            cal_results = calendar_service.events().list(
                calendarId="primary", maxResults=20, singleEvents=True, orderBy="startTime"
            ).execute()
            
            events = cal_results.get("items", [])
            for event in events:
                documents.append({
                    "id": event.get("id"),
                    "title": f"Calendar Event: {event.get('summary', 'Untitled Event')}",
                    "content": f"Event: {event.get('summary')}\nDescription: {event.get('description', '')}",
                    "source": "google_calendar",
                    "metadata": {
                        "start_time": event.get("start", {}).get("dateTime"),
                        "url": event.get("htmlLink"),
                        "type": "calendar"
                    }
                })

            return documents
        except Exception as e:
            logger.error(f"Error fetching Google services: {e}")
            raise RuntimeError(f"Failed to fetch Google Drive/Calendar documents: {e}")
