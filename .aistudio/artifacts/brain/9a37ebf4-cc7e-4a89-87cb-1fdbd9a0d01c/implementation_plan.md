# Implementation Plan: Ultra-Fast Dedicated Direct Playback Route

## 1. Goal
Provide the fastest, seamless direct file loading experience using a secondary route (e.g. `/direct/:filename`). When visiting a direct link, the application will completely skip loading the main page, gallery items, and stats, dedicating all system and network resources exclusively to loading and playing the target file unmuted in full screen. Exiting the player returns to the main menu.

---

## 2. Architecture & Performance Strategy

### A. Dedicated Direct Route Detection
- Detect whether the current URL matches `/direct/:filename` (or direct file paths).
- When a direct link is detected:
  - **Zero Main Page Overhead**: Bypass `fetchMedia()` and `fetchStats()`.
  - **No Background DOM**: Do not mount or render Navbar, Gallery Controls, Card Grids, or Footer.
  - **Single Targeted API Call**: Immediately query `/api/resolve?filename={filename}` to retrieve only the presigned stream URL for that specific file.

### B. Instant Full-Screen Unmuted Playback
- Mount a streamlined, dedicated full-viewport player component:
  - Auto-play begins immediately upon media resolution and readiness.
  - Video is **unmuted by default** (`muted = false`, `volume = 1.0`).
  - Graceful fallback for strict browser autoplay policies: listens for the first pointer or key event to instantly unmute and resume playback without UI friction.
  - True edge-to-edge full-screen layout with native controls.

### C. Clean Exit to Main Menu
- Exiting via:
  - The top-right Close button (`X`),
  - The `Escape` key, or
  - Double-clicking the screen
- Clears the direct mode and smoothly navigates to the root path (`/`), loading the main gallery interface on demand.

### D. Direct Link Generation
- Update the "Copy Link" actions across the app to generate clean direct URLs:
  `https://flare-media.vercel.app/direct/{exact_filename}`
  (e.g., `https://flare-media.vercel.app/direct/1014.mp4`).

---

## 3. Implementation Steps

1. **Standalone Direct Player Component (`src/components/DirectPlayer.tsx`)**:
   - Lightweight, standalone edge-to-edge viewer.
   - Dedicated audio unmuted autoplay logic and browser restriction handling.
   - Exit trigger calling navigation to main menu.

2. **Route Separation in `src/App.tsx`**:
   - Parse route path on initial mount (`/direct/*`).
   - If on `/direct/*`, render only `DirectPlayer` and defer all gallery/stats network requests.
   - If exiting, transition state and history to `/` and initialize main gallery data.

3. **Link Sharing Integration**:
   - Update copy link handler to format URLs as `${window.location.origin}/direct/${filename}`.

4. **Verification**:
   - Verify zero redundant requests on direct link loading.
   - Verify unmuted autoplay, full-screen viewport, and exit navigation to main menu.
   - Run compilation check.
