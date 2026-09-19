import urllib.request
import urllib.parse
import json

base = "https://metaphor-backend.onrender.com/api/v1/mcp"

print("--- Testing Remote MCP Handshake Against Production ---")

# 1. Discovery
req = urllib.request.urlopen("https://metaphor-backend.onrender.com/.well-known/oauth-authorization-server")
disc = json.loads(req.read())
print("[1/5] Discovery Endpoint OK:", disc["issuer"])

# 2. Dynamic Client Registration
reg_payload = json.dumps({
    "client_name": "ChatGPT Remote MCP Client",
    "redirect_uris": ["https://chatgpt.com/connector/oauth/test"]
}).encode()

r_reg = urllib.request.Request(f"{base}/oauth/register", data=reg_payload, headers={"Content-Type": "application/json"})
client_res = json.loads(urllib.request.urlopen(r_reg).read())
c_id = client_res["client_id"]
print("[2/5] DCR OK. Assigned Client ID:", c_id)

# 3. Authorize Code Request
auth_url = f"{base}/oauth/authorize?client_id={c_id}&redirect_uri=https://chatgpt.com/connector/oauth/test&response_type=code&code_challenge=test_challenge&code_challenge_method=plain"

class HTTP302NoFollow(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(HTTP302NoFollow)
try:
    opener.open(auth_url)
    print("[3/5] Authorize: No redirect header received.")
except urllib.error.HTTPError as e:
    loc = e.headers.get("Location")
    print("[3/5] Authorize 302 Redirect Received OK -> Location:", loc[:60] + "...")
    code = loc.split("code=")[1].split("&")[0]

# 4. Token Exchange (using application/x-www-form-urlencoded as ChatGPT does)
token_payload = urllib.parse.urlencode({
    "grant_type": "authorization_code",
    "client_id": c_id,
    "code": code,
    "redirect_uri": "https://chatgpt.com/connector/oauth/test",
    "code_verifier": "test_challenge"
}).encode()

try:
    r_tok = urllib.request.Request(f"{base}/oauth/token", data=token_payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
    tok_res = json.loads(urllib.request.urlopen(r_tok).read())
    access_token = tok_res["access_token"]
    print("[4/5] Token Exchange OK. Access Token Minted:", access_token[:24] + "...")
except urllib.error.HTTPError as e:
    print("[4/5] Token Exchange Failed:", e.code, e.read().decode("utf-8"))
    exit(1)

# 5. Execute MCP Initialize call with Bearer token
mcp_payload = json.dumps({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
}).encode()

r_mcp = urllib.request.Request(base, data=mcp_payload, headers={
    "Content-Type": "application/json",
    "Authorization": f"Bearer {access_token}"
})
mcp_res = json.loads(urllib.request.urlopen(r_mcp).read())
print("[5/5] Remote MCP JSON-RPC Response OK:", json.dumps(mcp_res, indent=2))
print("--- ALL 5 STEPS PASSED PERFECTLY ---")
