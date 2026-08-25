import logging
import httpx

logger = logging.getLogger(__name__)

async def fetch_notion_workspace(notion_token: str) -> str:
    """
    Fetches the latest updated pages and databases from a Notion workspace using a Developer Token.
    """
    if not notion_token:
        return "Failed to fetch Notion workspace: No integration token provided."
        
    try:
        headers = {
            "Authorization": f"Bearer {notion_token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.notion.com/v1/search",
                headers=headers,
                json={
                    "query": "",
                    "sort": {
                        "direction": "descending",
                        "timestamp": "last_edited_time"
                    },
                    "page_size": 10
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.error(f"Notion API error: {response.text}")
                return f"Failed to fetch from Notion: HTTP {response.status_code}"
                
            data = response.json()
            results = data.get("results", [])
            
            if not results:
                return "Notion Workspace connected, but no pages or databases were found."
                
            content_summary = "--- Notion Workspace Snapshot ---\n\n"
            for item in results:
                title = "Untitled"
                if item["object"] == "page":
                    # Title is usually buried in properties
                    props = item.get("properties", {})
                    for prop_name, prop_data in props.items():
                        if prop_data.get("type") == "title":
                            title_array = prop_data.get("title", [])
                            if title_array:
                                title = title_array[0].get("plain_text", "Untitled")
                                break
                    url = item.get("url", "")
                    content_summary += f"Page: {title}\nURL: {url}\nLast Edited: {item.get('last_edited_time')}\n\n"
                elif item["object"] == "database":
                    title_array = item.get("title", [])
                    if title_array:
                        title = title_array[0].get("plain_text", "Untitled")
                    url = item.get("url", "")
                    content_summary += f"Database: {title}\nURL: {url}\nLast Edited: {item.get('last_edited_time')}\n\n"
                    
            return content_summary
            
    except Exception as e:
        logger.error(f"Error fetching from Notion: {e}")
        return f"Failed to fetch Notion workspace: {str(e)}"
