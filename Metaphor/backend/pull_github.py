import httpx
import sys
import asyncio
import os

WEBHOOK_URL = "http://localhost:8000/api/v1/webhooks/github"

async def pull_events(repo: str):
    print(f"Fetching recent events for {repo}...")
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Metaphor-Pull-Script"
    }
    
    # If a personal access token is set, use it to increase rate limits
    token = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.github.com/repos/{repo}/events", headers=headers)
        if resp.status_code != 200:
            print(f"Error fetching from GitHub: {resp.status_code} - {resp.text}")
            return
            
        events = resp.json()
        push_events = [e for e in events if e.get("type") == "PushEvent"][:3]
        
        if not push_events:
            print("No recent push events found for this repository.")
            return
            
        print(f"Found {len(push_events)} push events. Replaying them into Metaphor...")
        
        for i, event in enumerate(reversed(push_events)): # oldest first
            # Construct a webhook-like payload from the event
            payload = {
                "repository": {
                    "full_name": repo,
                    "name": repo.split("/")[-1]
                },
                "sender": {
                    "login": event["actor"]["login"]
                },
                "commits": event["payload"].get("commits", [])
            }
            
            print(f"[{i+1}/{len(push_events)}] Sending push event by {event['actor']['login']} with {len(payload['commits'])} commits...")
            
            webhook_headers = {
                "x-github-event": "push",
                "Content-Type": "application/json"
            }
            
            w_resp = await client.post(WEBHOOK_URL, json=payload, headers=webhook_headers, timeout=60.0)
            if w_resp.status_code == 200:
                print(f"  -> Success: {w_resp.json()}")
            else:
                print(f"  -> Failed: {w_resp.status_code} - {w_resp.text}")

if __name__ == "__main__":
    repo = sys.argv[1] if len(sys.argv) > 1 else "torvalds/linux"
    if repo == "torvalds/linux":
        print("Usage: python pull_github.py <owner>/<repo>")
        print("Defaulting to torvalds/linux just to show it works...\n")
        
    asyncio.run(pull_events(repo))
