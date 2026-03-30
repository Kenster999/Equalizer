# Equalizer — File Index

Paste these URLs at the start of each Claude Chat session to enable access to all project files:

```
https://api.github.com/repos/Kenster999/Equalizer/contents/docs/file-index.md
https://api.github.com/repos/Kenster999/Equalizer/contents/src/equalizer.js
https://raw.githubusercontent.com/Kenster999/Equalizer/main/docs/coding-standards.md
https://raw.githubusercontent.com/Kenster999/Equalizer/main/SPEC.md
```

## Key Project Files

| File | URL |
|------|-----|
| `src/equalizer.js` | `https://raw.githubusercontent.com/Kenster999/Equalizer/main/src/equalizer.js` |
| `SPEC.md` | `https://raw.githubusercontent.com/Kenster999/Equalizer/main/SPEC.md` |
| `CLAUDE.md` | `https://raw.githubusercontent.com/Kenster999/Equalizer/main/CLAUDE.md` |
| `docs/github-in-claude-web.md` | `https://raw.githubusercontent.com/Kenster999/Equalizer/main/docs/github-in-claude-web.md` |
| `docs/file-index.md` | `https://api.github.com/repos/Kenster999/Equalizer/contents/docs/file-index.md` |
| `docs/coding-standards.md` | `https://raw.githubusercontent.com/Kenster999/Equalizer/main/docs/coding-standards.md` |

## Screenshots

| File | URL |
|------|-----|
| `docs/screenshots/2026-03-18-01a-ScoringSizingBad.jpeg` | `https://raw.githubusercontent.com/Kenster999/Equalizer/main/docs/screenshots/2026-03-18-01a-ScoringSizingBad.jpeg` |

## Notes
- `file-index.md` and `equalizer.js` use GitHub Contents API URLs (`api.github.com`) to avoid Chat session caching — paste those as-is into Chat
- All other files use `raw.githubusercontent.com` URLs
- raw.githubusercontent.com URLs require the user to paste them into Chat
- jsDelivr must not be used for any files — always use raw.githubusercontent.com to avoid stale cache issues
- Always keep this file updated when adding/removing project files
