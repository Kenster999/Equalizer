# GitHub Access in Claude Code Web Sessions

## Environment Constraints

- **`gh` CLI is NOT installed** — don't try to use it
- **Cannot push directly to `main`** — the git proxy only allows pushing to `claude/` branches (403 otherwise)
- **No `GITHUB_TOKEN` in environment by default**

## How Git Works Here

The local git remote points to a proxy at `http://local_proxy@127.0.0.1:45677/git/<owner>/<repo>`, which forwards to Anthropic's session ingress, which forwards to GitHub. This only supports git protocol (fetch/push), **not** the GitHub REST API.

## How to Use the GitHub REST API

**Requirement:** The user must provide a GitHub Personal Access Token (PAT) with `repo` scope.

Once you have it, use `curl` directly against `api.github.com`:

```bash
GITHUB_TOKEN="github_pat_..."

# Create a PR
curl -s -X POST "https://api.github.com/repos/<owner>/<repo>/pulls" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PR title",
    "body": "PR description",
    "head": "claude/your-branch-name",
    "base": "main"
  }'

# Merge a PR (by number)
curl -s -X PUT "https://api.github.com/repos/<owner>/<repo>/pulls/<number>/merge" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d '{"merge_method":"merge"}'

# List open PRs
curl -s "https://api.github.com/repos/<owner>/<repo>/pulls" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json"

# Get a specific PR
curl -s "https://api.github.com/repos/<owner>/<repo>/pulls/<number>" \
  -H "Authorization: Bearer $GITHUB_TOKEN"

# Comment on a PR/issue
curl -s -X POST "https://api.github.com/repos/<owner>/<repo>/issues/<number>/comments" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body": "comment text"}'

# Close a PR
curl -s -X PATCH "https://api.github.com/repos/<owner>/<repo>/pulls/<number>" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": "closed"}'

# Commit a file directly to a branch (no PR needed)
# First get the current file SHA if it exists (omit sha field for new files)
curl -s -X PUT "https://api.github.com/repos/<owner>/<repo>/contents/<path/to/file>" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "commit message",
    "content": "<base64-encoded file content>",
    "branch": "main"
  }'
```

## The Normal Workflow

1. **Do your work** on the designated `claude/...` branch
2. **Commit and push** — `git push -u origin claude/your-branch-name` (this works without a PAT)
3. **Ask the user for their GitHub PAT** if you need to create/merge/manage PRs or commit directly to main
4. **Use `curl` + REST API** for all GitHub UI operations (PRs, issues, comments, merges, direct commits)

## Committing Directly to Main (no PR)

Since you can't `git push` to main, use the GitHub Contents API:

```bash
GITHUB_TOKEN="github_pat_..."
CONTENT_B64=$(echo -n "file contents here" | base64 -w 0)
# Or for a file: CONTENT_B64=$(base64 -w 0 < myfile.txt)

curl -s -X PUT "https://api.github.com/repos/<owner>/<repo>/contents/<path>" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"your commit message\",
    \"content\": \"$CONTENT_B64\",
    \"branch\": \"main\"
  }"
```

To **update** an existing file, first fetch its SHA and include it:

```bash
SHA=$(curl -s "https://api.github.com/repos/<owner>/<repo>/contents/<path>" \
  -H "Authorization: Bearer $GITHUB_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

curl -s -X PUT "https://api.github.com/repos/<owner>/<repo>/contents/<path>" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"update message\",
    \"content\": \"$CONTENT_B64\",
    \"sha\": \"$SHA\",
    \"branch\": \"main\"
  }"
```

## Why `api.github.com` is reachable

The `GLOBAL_AGENT_HTTP_PROXY` environment variable routes outbound HTTPS through Anthropic's egress gateway, and `api.github.com` is in the allowlist — so direct `curl` calls to the GitHub API work fine. You just need the PAT for authenticated operations.
