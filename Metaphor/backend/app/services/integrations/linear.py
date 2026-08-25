import logging
import httpx

logger = logging.getLogger(__name__)

async def fetch_linear_workspace(api_key: str) -> str:
    """
    Fetches recent Linear issues using a Personal API Key.
    """
    if not api_key:
        return "Failed to fetch Linear workspace: No API key provided."
        
    try:
        # OAuth tokens typically require the Bearer prefix
        auth_header = api_key if api_key.startswith("Bearer ") else f"Bearer {api_key}"
        headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json"
        }
        
        query = """
        query {
          issues(first: 10, orderBy: updatedAt) {
            nodes {
              title
              description
              state { name }
              assignee { name }
              project { name }
              updatedAt
            }
          }
        }
        """
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.linear.app/graphql",
                headers=headers,
                json={"query": query},
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.error(f"Linear API error: {response.text}")
                return f"Failed to fetch from Linear: HTTP {response.status_code}"
                
            data = response.json()
            issues = data.get("data", {}).get("issues", {}).get("nodes", [])
            
            content_summary = "--- Linear Workspace Snapshot ---\n\n"
            if not issues:
                return content_summary + "No recent issues found in Linear."
                
            for issue in issues:
                title = issue.get("title")
                state = issue.get("state", {}).get("name", "Unknown") if issue.get("state") else "Unknown"
                assignee = issue.get("assignee", {}).get("name", "Unassigned") if issue.get("assignee") else "Unassigned"
                project = issue.get("project", {}).get("name", "No Project") if issue.get("project") else "No Project"
                desc = issue.get("description", "")
                if desc and len(desc) > 100:
                    desc = desc[:100] + "..."
                    
                content_summary += f"Issue: [{project}] {title} ({state})\n"
                content_summary += f"Assignee: {assignee}\n"
                if desc:
                    content_summary += f"Description: {desc}\n"
                content_summary += "\n"
                
            return content_summary
            
    except Exception as e:
        logger.error(f"Error fetching from Linear: {e}")
        return f"Failed to fetch Linear workspace: {str(e)}"
