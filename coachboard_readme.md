# Coachboard

Coachboard is a lightweight, browser-based video film review and telestration tool built for coaches, analysts, and athletes. It allows you to load YouTube game film, create time-based breakdowns, tag athletes, and draw telestration overlays to analyze plays and situations.

The tool runs **entirely in the browser** with no backend or server required. All data is stored locally using browser storage, making it fast, portable, and ideal for coaching sessions, film study, and remote analysis.

---

## Features

### 🎥 Video Playback
- Load YouTube videos via URL
- Play, pause, mute, and step forward/backward
- Playback is controlled via UI buttons (video clicks are disabled for focus)

### ⏱️ Timestamped Film Breakdown
- Create timestamps at the current playhead position
- Each timestamp includes:
  - Title
  - Notes / description
  - Tagged athletes
  - Saved telestration drawings

### 🏷️ Athlete Roster & Tagging
- Create and manage an athlete roster
- Import roster via CSV
- Each athlete includes:
  - System-generated ID
  - First name / last name
  - Position
  - Jersey number
  - Team
- Tag or untag athletes per timestamp with a single click

### ✏️ Telestration / Drawing
- Draw directly over the video using a canvas overlay
- Multiple colors and stroke sizes
- Drawings are saved per timestamp
- Drawings automatically reload when revisiting a timestamp

### 💾 Local-First Architecture
- No backend, no database, no authentication
- All data stored in browser local storage
- Works offline once the page is loaded

---

## What Coachboard Is (and Is Not)

**Coachboard is:**
- A fast film review tool for coaching and analysis
- A local-first solution for private sessions
- A foundation for more advanced coaching workflows

**Coachboard is NOT:**
- A replacement for professional broadcast replay systems
- A cloud-based collaboration platform (yet)
- A video hosting service

---

## Limitations

- YouTube does not support true reverse playback
  - Reverse actions step the playhead backward instead
- Data is stored per browser/device
  - Clearing browser storage will remove saved projects

---

## Getting Started

### Option 1: GitHub Pages
1. Open the hosted version via GitHub Pages
2. Paste a YouTube video URL
3. Click **Load** to initialize the player
4. Add timestamps, notes, tags, and drawings

### Option 2: Local Use
1. Download or clone this repository
2. Open `index.html` in a modern browser (Chrome, Edge, Opera)
3. No build step or server required

---

## CSV Roster Format

Example CSV format for importing a roster:

```
first_name,last_name,position,jersey,team
John,Doe,QB,12,Varsity
Mike,Smith,WR,80,Varsity
```

IDs are generated automatically by the system.

---

## Project Philosophy

Coachboard is designed around these principles:
- **Speed over complexity**
- **Local-first, private by default**
- **Coach-focused UX**
- **Extensible foundation for future growth**

---

## Roadmap

### v1.4 – Project & Data Management
- Project save / load (JSON export & import)
- Multiple projects per browser
- Clear separation between film sessions

### v1.5 – Sharing & Collaboration
- Read-only share links (timestamp + notes view)
- Export timestamp reports (PDF / CSV)
- Coach-to-athlete feedback mode

### v1.6 – Advanced Film Tools
- Side-by-side video comparison
- Slow-motion playback presets
- Keyboard shortcuts for coaching workflows

### v2.0 – Cloud & Multi-User (Optional)
- Optional cloud sync (opt-in)
- User accounts and team spaces
- Multi-device access
- Secure sharing between coaches and athletes

---

## Status

This project is actively evolving. Current version focuses on stability, UX refinement, and preparing the foundation for future expansion.

Feedback and iteration are welcome.

