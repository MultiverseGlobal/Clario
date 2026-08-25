import logging
from typing import List, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger("metaphor.parsers.github")

class GitHubParser:
    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json"
        }
        if settings.GITHUB_PERSONAL_ACCESS_TOKEN:
            self.headers["Authorization"] = f"token {settings.GITHUB_PERSONAL_ACCESS_TOKEN}"

    async def fetch_documents(self) -> List[Dict[str, Any]]:
        """
        Fetch commits, issues, and README files.
        Raises an explicit RuntimeError if GITHUB_PERSONAL_ACCESS_TOKEN is missing or invalid.
        """
        if not settings.GITHUB_PERSONAL_ACCESS_TOKEN:
            logger.error("GitHub access token is not configured.")
            raise RuntimeError("GitHub access token is missing or invalid.")

        try:
            documents = []
            async with httpx.AsyncClient() as client:
                response = await client.get("https://api.github.com/user/repos", headers=self.headers)
                response.raise_for_status()
                repos = response.json()[:5]

                for repo in repos:
                    repo_name = repo.get("full_name")
                    readme_resp = await client.get(f"https://api.github.com/repos/{repo_name}/readme", headers=self.headers)
                    if readme_resp.status_code == 200:
                        documents.append({
                            "id": f"github_readme_{repo_name}",
                            "title": f"GitHub README: {repo_name}",
                            "content": readme_resp.json().get("content", ""),
                            "source": "github",
                            "metadata": {
                                "repo": repo_name,
                                "type": "readme"
                            }
                        })

                    commits_resp = await client.get(f"https://api.github.com/repos/{repo_name}/commits?per_page=5", headers=self.headers)
                    if commits_resp.status_code == 200:
                        for commit in commits_resp.json():
                            sha = commit.get("sha", "")[:7]
                            commit_msg = commit.get("commit", {}).get("message", "")
                            author = commit.get("commit", {}).get("author", {}).get("name", "Unknown")
                            date = commit.get("commit", {}).get("author", {}).get("date", "")

                            documents.append({
                                "id": f"github_commit_{sha}",
                                "title": f"GitHub Commit [{repo_name}]: {commit_msg[:50]}",
                                "content": f"Commit by {author} on {date}\nSHA: {sha}\nRepo: {repo_name}\nMessage: {commit_msg}",
                                "source": "github",
                                "metadata": {
                                    "repo": repo_name,
                                    "sha": sha,
                                    "author": author,
                                    "date": date,
                                    "type": "commit"
                                }
                            })
            return documents
        except Exception as e:
            logger.error(f"Error fetching GitHub documents: {e}")
            raise RuntimeError(f"Failed to fetch GitHub documents: {e}")
