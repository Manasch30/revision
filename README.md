# Adaptive Spaced Revision

An evidence-backed, offline-first adaptive spaced-retrieval revision planner inspired by forgetting-curve research. Built with clean, tactile monochrome dark styling and designed for zero-friction deployment to Vercel.

---

## 🧠 Practical Retention Principles

Built around a realistic forgetting-curve study routine:

1. **Within 3 Hours**: First retrieval check (~2.5 hrs after learning) to catch immediate short-term memory decay.
2. **End of Day (7:00 PM)**: Same-day evening consolidation study session.
3. **The Usual Spaced Milestones**: Expanding multi-day intervals:
   - **Day 1 (Tomorrow at 7 PM)**
   - **Day 3**
   - **Day 7 (1 Week)**
   - **Day 14 (2 Weeks)**
   - **Day 30+ (1 Month)**

- **Strict 3 Recall Choices** (No "Easy" button — "Good" is the target recall standard):
  - **Good** — Advances to the next milestone.
  - **Hard** — Re-checks sooner or holds milestone before advancing.
  - **Forget** — Resets back to End of Day or Day 1 to re-strengthen.

---

## ✨ Features

- **Today Screen**: Instant retrieval queue (`nextAt <= now`) with relative due countdowns, current intervals, one-tap grading, and "Later Today" preview.
- **Spacious Calendar**: Full monthly view plotting revision milestones with click-to-inspect daily agendas.
- **Schedule Visualization**: Distribution of topics grouped into clear milestone brackets (`Within 3 hrs`, `End of Day (7 PM)`, `Day 1`, `Day 3`, `Day 7`, `Day 14`, `Day 30+`).
- **Subjects & Topics Manager**: Organize learning hierarchies with date/time completion logging and complete recall audit trails.
- **Monochrome Dark Aesthetic**: Tactile, low-key, zero-nonsense dark design system.
- **100% Offline & PWA**: Service Worker caching, Android installable web app manifest, and local storage persistence.
- **Data Portability**: Full JSON backup export and import.

---

## 🚀 Deployment to Vercel

This app contains zero build dependencies or external frameworks. It deploys instantly out of the box.

### Option 1: Vercel CLI
```bash
vercel --prod
```

### Option 2: Push to GitHub
```bash
git remote add origin <YOUR_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```
Then import the repository on [Vercel](https://vercel.com/new).

---

## 💻 Local Development

Run any local static HTTP server:
```bash
# Using Python 3
python3 -m http.server 3000

# Or using npx serve
npx serve .
```
Then open `http://localhost:3000` in your browser.
