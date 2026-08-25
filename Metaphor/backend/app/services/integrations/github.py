import base64
import logging
import asyncio
from github import Github
from github.GithubException import GithubException

logger = logging.getLogger(__name__)


async def fetch_all_user_repositories(github_token: str) -> str:
    """
    Fetches all repositories accessible to the authenticated user (via OAuth token)
    including private repos, along with their READMEs and descriptions.
    Returns a rich text summary suitable for ingestion into the context graph.
    """
    def _fetch():
        try:
            g = Github(github_token)
            user = g.get_user()
            repos = list(user.get_repos(sort="updated", direction="desc"))[:20]  # Cap at 20 most-recently-updated

            summary = f"GitHub Account: {user.login} ({user.name or 'N/A'})\n"
            summary += f"Total repos: {user.public_repos} public"
            if user.total_private_repos:
                summary += f" + {user.total_private_repos} private"
            summary += "\n\n"

            for repo in repos:
                summary += f"--- Repository: {repo.full_name} ---\n"
                summary += f"Description: {repo.description or 'No description'}\n"
                summary += f"Language: {repo.language or 'N/A'}, Stars: {repo.stargazers_count}, Forks: {repo.forks_count}\n"
                summary += f"Topics: {', '.join(repo.get_topics()) or 'none'}\n"
                try:
                    readme = repo.get_readme()
                    readme_content = base64.b64decode(readme.content).decode("utf-8")
                    # Truncate long READMEs to keep context manageable
                    if len(readme_content) > 2000:
                        readme_content = readme_content[:2000] + "\n... (truncated)"
                    summary += f"README:\n{readme_content}\n\n"
                except GithubException:
                    summary += "(No README)\n\n"

            return summary
        except Exception as e:
            logger.error(f"Error fetching all GitHub repositories: {e}")
            return f"Failed to fetch GitHub repositories: {str(e)}"

    return await asyncio.to_thread(_fetch)


async def fetch_public_repository(repo_name: str, github_token: str | None = None) -> str:
    """
    Fetches the README and a summary of a single GitHub repository.
    Kept for backwards compatibility — prefer fetch_all_user_repositories when a token is available.
    """
    def _fetch():
        try:
            if github_token:
                g = Github(github_token)
            else:
                g = Github()  # Unauthenticated fallback

            repo = g.get_repo(repo_name)

            content_summary = f"GitHub Repository: {repo.full_name}\n"
            content_summary += f"Description: {repo.description or 'No description'}\n"
            content_summary += f"Stars: {repo.stargazers_count}, Forks: {repo.forks_count}\n\n"

            try:
                readme = repo.get_readme()
                readme_content = base64.b64decode(readme.content).decode("utf-8")
                content_summary += f"--- README.md ---\n{readme_content}\n"
            except GithubException:
                content_summary += "--- README.md ---\n(No README found)\n"

            return content_summary
        except Exception as e:
            logger.error(f"Error fetching github repo {repo_name}: {e}")
            return f"Failed to fetch GitHub repository {repo_name}: {str(e)}"

    return await asyncio.to_thread(_fetch)
