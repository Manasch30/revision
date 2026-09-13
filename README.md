# Adaptive Spaced Revision

An evidence-backed, offline-first adaptive spaced-retrieval revision planner inspired by forgetting-curve research. Built with clean, tactile monochrome dark styling and designed for zero-friction deployment to Vercel.

---

## 🧠 Scientific Principles

Rather than imposing a dogmatic 8-stage Ebbinghaus timetable, intervals recalibrate dynamically based on genuine active recall effort:

- **Initial Retrieval Check**: Exactly **20 minutes** after learning completion.
- **Strict 3 Recall Choices** (No "Easy" button — "Good" is the target recall standard):
  - **Forget** — Could not retrieve / major gaps:
    $$\text{next interval} = \max(20\text{ min}, \text{previous} \times 0.25)$$
  - **Hard** — Retrieved with significant struggle:
    $$\text{next interval} = \max(60\text{ min}, \text{previous} \times 1.8)$$
  - **Good** — Retrieved adequately:
    $$\text{next interval} = \max(120\text{ min}, \text{previous} \times 3.0)$$

---

## ✨ Features

- **Today Screen**: Instant retrieval queue (`nextAt <= now`) with relative due countdowns, current intervals, one-tap grading, and "Later Today" preview.
- **Spacious Calendar**: Full monthly view plotting revision milestones with click-to-inspect daily agendas.
- **Schedule Visualization**: Distribution of topics grouped into expanding interval brackets (`20 min`, `1 hr - 2 hr`, `6 hr`, `1 day`, `2 days`, `3 days`, `7 days`, `14+ days`).
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
