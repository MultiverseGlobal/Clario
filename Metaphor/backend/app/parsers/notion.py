import logging
from typing import List, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger("metaphor.parsers.notion")

class NotionParser:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {settings.NOTION_INTEGRATION_TOKEN}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        }

    async def fetch_documents(self) -> List[Dict[str, Any]]:
        """
        Fetch pages/databases from Notion.
        Raises an explicit RuntimeError if NOTION_INTEGRATION_TOKEN is invalid or missing.
        """
        if not settings.NOTION_INTEGRATION_TOKEN:
            logger.error("Notion integration token is not configured.")
            raise RuntimeError("Notion integration token is missing or invalid.")

        try:
            async with httpx.AsyncClient() as client:
                # Query all pages accessible to this integration token
                response = await client.post(
                    "https://api.notion.com/v1/search",
                    headers=self.headers,
                    json={"filter": {"value": "page", "property": "object"}}
                )
                response.raise_for_status()
                search_results = response.json().get("results", [])

                documents = []
                for page in search_results:
                    page_id = page.get("id")
                    title = "Untitled Page"
                    try:
                        properties = page.get("properties", {})
                        title_property = properties.get("title") or properties.get("Name")
                        if title_property and title_property.get("title"):
                            title = title_property["title"][0]["plain_text"]
                    except Exception:
                        pass

                    content = await self._fetch_page_content(page_id)
                    documents.append({
                        "id": page_id,
                        "title": f"Notion Page: {title}",
                        "content": content,
                        "source": "notion",
                        "metadata": {
                            "url": page.get("url"),
                            "created_time": page.get("created_time"),
                            "last_edited_time": page.get("last_edited_time")
                        }
                    })
                return documents
        except Exception as e:
            logger.error(f"Error fetching Notion documents: {e}")
            raise RuntimeError(f"Failed to fetch Notion documents: {e}")

    async def _fetch_page_content(self, page_id: str) -> str:
        """Helper to fetch block children and format as Markdown-like text."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.notion.com/v1/blocks/{page_id}/children",
                    headers=self.headers
                )
                response.raise_for_status()
                blocks = response.json().get("results", [])
                
                text_blocks = []
                for block in blocks:
                    block_type = block.get("type")
                    if block_type in ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item"]:
                        content_list = block.get(block_type, {}).get("rich_text", [])
                        text = "".join([t.get("plain_text", "") for t in content_list])
                        if text:
                            if block_type == "heading_1":
                                text_blocks.append(f"# {text}")
                            elif block_type == "heading_2":
                                text_blocks.append(f"## {text}")
                            elif block_type == "heading_3":
                                text_blocks.append(f"### {text}")
                            else:
                                text_blocks.append(text)
                return "\n\n".join(text_blocks)
        except Exception as e:
            logger.error(f"Error fetching blocks for Notion page {page_id}: {e}")
            return ""
