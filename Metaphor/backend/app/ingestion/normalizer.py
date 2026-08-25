import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid

from app.models import UniversalEvent

logger = logging.getLogger("metaphor.ingestion.normalizer")

class EventNormalizer:
    """
    Universal Event Normalizer for Metaphor Context OS.
    Converts raw connector payloads (GitHub, Notion, Google Calendar, etc.)
    into normalized UniversalEvent instances.
    """

    def normalize(self, doc: Dict[str, Any]) -> UniversalEvent:
        source = doc.get("source", "unknown").lower()
        metadata = doc.get("metadata", {})
        doc_type = metadata.get("type", "generic")

        if source == "github":
            return self._normalize_github(doc, doc_type)
        elif source == "notion":
            return self._normalize_notion(doc, doc_type)
        elif source in ("google", "google_calendar", "gcal"):
            return self._normalize_google_calendar(doc, doc_type)
        else:
            return self._normalize_generic(doc)

    def _normalize_github(self, doc: Dict[str, Any], doc_type: str) -> UniversalEvent:
        metadata = doc.get("metadata", {})
        title = doc.get("title", "")
        content = doc.get("content", "")

        if doc_type == "commit":
            entity = "commit"
            action = "pushed"
            author = metadata.get("author", "Unknown")
            repo = metadata.get("repo", "unknown-repo")
            timestamp_str = metadata.get("date")
            ts = self._parse_iso_date(timestamp_str)

            normalized = {
                "title": title,
                "summary": content.split("\n\n")[0] if "\n\n" in content else content[:200],
                "actor": author,
                "target": repo,
                "metadata": metadata,
                "full_text": content
            }
        elif doc_type == "issue":
            entity = "issue"
            action = "opened"
            author = metadata.get("author", "Unknown")
            repo = metadata.get("repo", "unknown-repo")
            timestamp_str = metadata.get("created_at")
            ts = self._parse_iso_date(timestamp_str)

            normalized = {
                "title": title,
                "summary": content[:300],
                "actor": author,
                "target": repo,
                "metadata": metadata,
                "full_text": content
            }
        else: # e.g. readme or generic repo file
            entity = "document"
            action = "updated"
            repo = metadata.get("repo", "unknown-repo")
            ts = datetime.utcnow()

            normalized = {
                "title": title,
                "summary": f"Repository documentation updated for {repo}",
                "actor": repo,
                "target": repo,
                "metadata": metadata,
                "full_text": content
            }

        return UniversalEvent(
            source="github",
            entity=entity,
            action=action,
            timestamp=ts,
            raw_payload=doc,
            normalized_payload=normalized
        )

    def _normalize_notion(self, doc: Dict[str, Any], doc_type: str) -> UniversalEvent:
        metadata = doc.get("metadata", {})
        title = doc.get("title", "")
        content = doc.get("content", "")
        last_edited = metadata.get("last_edited_time")
        ts = self._parse_iso_date(last_edited)

        entity = "page" if doc_type != "database" else "database"
        action = "updated"

        normalized = {
            "title": title,
            "summary": content[:300] if content else title,
            "actor": metadata.get("author", "Notion Workspace"),
            "target": metadata.get("url", title),
            "metadata": metadata,
            "full_text": content
        }

        return UniversalEvent(
            source="notion",
            entity=entity,
            action=action,
            timestamp=ts,
            raw_payload=doc,
            normalized_payload=normalized
        )

    def _normalize_google_calendar(self, doc: Dict[str, Any], doc_type: str) -> UniversalEvent:
        metadata = doc.get("metadata", {})
        title = doc.get("title", "")
        content = doc.get("content", "")
        start_time = metadata.get("start") or metadata.get("date")
        ts = self._parse_iso_date(start_time)

        normalized = {
            "title": title,
            "summary": content[:300] if content else title,
            "actor": metadata.get("organizer", "Calendar Host"),
            "target": "Google Calendar",
            "attendees": metadata.get("attendees", []),
            "metadata": metadata,
            "full_text": content
        }

        return UniversalEvent(
            source="google_calendar",
            entity="meeting",
            action="scheduled",
            timestamp=ts,
            raw_payload=doc,
            normalized_payload=normalized
        )

    def _normalize_generic(self, doc: Dict[str, Any]) -> UniversalEvent:
        title = doc.get("title", "Untitled Event")
        content = doc.get("content", "")
        source = doc.get("source", "generic").lower()

        normalized = {
            "title": title,
            "summary": content[:300] if content else title,
            "actor": "System",
            "target": source,
            "metadata": doc.get("metadata", {}),
            "full_text": content
        }

        return UniversalEvent(
            source=source,
            entity="event",
            action="recorded",
            timestamp=datetime.utcnow(),
            raw_payload=doc,
            normalized_payload=normalized
        )

    def _parse_iso_date(self, date_str: Optional[str]) -> datetime:
        if not date_str:
            return datetime.utcnow()
        try:
            # Strip trailing 'Z' if present for standard isoformat
            clean_str = date_str.replace("Z", "+00:00")
            return datetime.fromisoformat(clean_str)
        except Exception:
            return datetime.utcnow()

normalizer = EventNormalizer()
