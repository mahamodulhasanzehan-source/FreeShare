# FlareMedia — Anonymous High-Performance Media Sharing Platform (Revised)

FlareMedia is a full-stack, zero-account image and video sharing platform backed entirely by a private Backblaze B2 bucket via its S3-compatible API. The revised architecture eliminates external databases while solving S3 lexicographical sorting and metadata retrieval, enforces production bot protection with Cloudflare Turnstile, optimizes presigned URL performance, and guarantees strict browser sandboxing for SVG vectors.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following revisions address all requirements for a durable, deployment-independent Backblaze-only architecture:

- **Durable Self-Describing Key Indexing**: S3 `ListObjectsV2` does not return `Content-Type` or custom headers and sorts strictly lexicographically. To deliver **instant Newest-First pagination without N `HeadObject` network requests or fragile in-memory caches**, all objects use a deterministic self-describing key schema:
  `v1/{invertedTimestampMs}_{type}_{fileId}_{encodedOriginalFilename}.{ext}`
  - `invertedTimestampMs`: `String(9999999999999 - Date.now()).padStart(13, '0')`. Lexicographical ascending sort naturally equals chronological descending order (Newest first).
  - `type`: `img` or `vid`.
  - `fileId`: 10-character cryptographically random ID.
  - `encodedOriginalFilename`: URL-safe base64 or URL-encoded original filename with extension.
  - **Result**: A single `ListObjectsV2` query instantly returns the upload time, media type, original filename, and size for an entire page of items with **zero extra round-trips**.
- **Production Cloudflare Turnstile Verification**: All anonymous upload initiations (`/api/upload/presign` and `/api/upload/multipart/start`) verify Turnstile challenge tokens against Cloudflare's siteverify endpoint in production. Browsing, viewing, and downloading remain challenge-free.
- **On-Demand Presigning & Mobile-Aware Gallery**:
  - The gallery signs temporary view URLs only for the current active page (batch of 24 items). Signing is pure HMAC-SHA256 math done locally in Node.js (<5ms).
  - Video hover previews automatically cancel and unmount playback when the cursor leaves.
  - Hover auto-play is strictly disabled on mobile/touch viewports (`(hover: none)`) to protect data and battery.
- **Safe SVG Handling**: SVGs are rendered exclusively via sandboxed `<img>` tags (where browser engines block script execution) or in safe vector preview containers. Direct view/download links for SVGs enforce `Content-Disposition: attachment; filename="..."` to prevent XSS.
- **Direct S3 Multipart Transfers & CORS**: Browser transfers 10 MB chunks directly to Backblaze. Bucket CORS must expose the `ETag` header (`ExposeHeaders: ["ETag"]`) so the browser can collect ETags to finalize `CompleteMultipartUpload`.
- **Absolute Preservation of Original Media**: Media is never resized, re-encoded, or transcoded.

---

### 1. Overview & Core Concept

- **What It Does**: Anonymous media repository where anyone can upload high-resolution photos and videos, inspect a unified gallery, filter by media category, play videos natively, and share permanent links (`/?v={key}`) that dynamically generate short-lived signed access tokens.
- **Target Audience / Persona**: Photographers, digital artists, videographers, and creators sharing lossless media anonymously without signing in.
- **Key Value**: 100% original byte preservation, zero accounts or tracking, high-speed multipart uploads for large video files, and no external database dependencies.

---

### 2. User Experience & Visual Design

#### Visual Identity & Theme
- **Aesthetic Direction**: Minimalist cinematic dark interface. Pure dark canvas (`#09090b`), slate structural containers (`#18181b`), crisp white accents (`#ffffff`), and muted zinc metadata (`#71717a`).
- **Color Palette (60-30-10 Rule)**:
  - `60% Canvas`: Deep neutral background (`#09090b`).
  - `30% Surfaces`: Matte card frames (`#141416`), hairline borders (`rgba(255,255,255,0.08)`).
  - `10% Accent`: High-contrast pure white CTAs and subtle electric blue (`#38bdf8`) indicators.
- **Typography & Formatting**:
  - Display Font: `Plus Jakarta Sans` / `Outfit` with tight tracking (`tracking-tight`).
  - Metadata: Clean unboxed text with `·` separators (`PNG · 18.4 MB · 2 hours ago`). Never wrapped in rounded pill bubbles.
  - Numbers: Tabular numerals (`font-mono tabular-nums`) for byte counts, speeds, and timestamps.

#### Media Player & Gallery Behavior
- **High-Density Media Wall**: Responsive grid with variable aspect ratio handling.
- **Hover Video Previews**: Hovering over a video tile loads metadata and initiates silent, muted loop playback. Leaving the tile immediately unloads and pauses the video. Disabled on touch devices.
- **Fullscreen Lightbox**: Unobstructed viewing, zooming, full video playback controls, copy permanent link button, and direct download trigger.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Self-Describing S3 Key Schema vs. External Database
- **Chosen Approach**: All metadata (timestamp, type, unique ID, original filename) is embedded into the object key with an inverted timestamp prefix (`v1/{9999999999999-timestamp}_{type}_{id}_{filename}`).
- **Why**: S3 `ListObjectsV2` provides zero custom metadata and sorts only by key name. With this schema, Backblaze B2 serves as the single source of truth, Newest-First sorting is native to S3, and pagination works reliably with standard `ContinuationToken` across all serverless instances.
- **Identified Limitations**:
  - Global filename search across millions of objects in pure S3 requires scanning keys or client-side filtering on loaded pages.
  - "Oldest First" sorting in pure S3 either requires fetching the reverse page or sorting loaded batches. We support Newest/Oldest on retrieved pages and explain this trade-off clearly.

#### Decision 2: Cloudflare Turnstile & Realistic Abuse Boundaries
- **Chosen Approach**: Server validates `turnstileToken` on upload endpoints when `TURNSTILE_SECRET_KEY` is present.
- **Abuse Reality & Safeguards**:
  - Turnstile eliminates automated bot abuse and scripted flooding.
  - However, motivated human users can still upload objectionable content or fill up storage.
  - FlareMedia enforces server-side MIME verification, per-file limits, and a global hard ceiling (`MAX_TOTAL_STORAGE_BYTES=9500000000` / ~9.5 GB). When the limit is reached, all uploads are rejected.

#### Decision 3: SVG Sandboxing & XSS Protection
- **Chosen Approach**: SVGs are rendered only inside `<img src="...">` elements (where browser engines strictly disallow `<script>` execution) and served with `Content-Disposition: attachment` when downloaded.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FLAREMEDIA                                │
│                          Browser Client (React)                        │
└───────┬────────────────────────────┬────────────────────────────┬──────┘
        │ 1. Request Presigned Upload│ 2. Direct S3 Upload        │ 3. Request Gallery /
        │    (+ Turnstile Token)     │    (10 MB S3 Chunks)       │    Permanent Link
        ▼                            ▼                            ▼
┌───────────────────────────┐ ┌───────────────┐ ┌────────────────────────┐
│   Vercel / Node Backend   │ │ Backblaze B2  │ │  Presigned View /      │
│  - Validate Turnstile     │ │ Direct S3 PUT │ │  Download URL (15m)    │
│  - Generate Self-Desc Key │ │ + Multi-Part  │ │  (Signed On-Demand)    │
└─────────────┬─────────────┘ └───────┬───────┘ └───────────┬────────────┘
              │                       │                     │
              │ AWS S3 SDK            │ Direct Presigned    │ S3 SDK
              │ (Secret Keys Safe)    │ HTTP Stream         │ GetObject Presign
              ▼                       ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKBLAZE B2 PRIVATE BUCKET                        │
│                   Endpoint: eu-central-003.backblazeb2.com              │
│                      Bucket: Hmmmmmmmmm08                              │
│       Key: v1/{invertedTs}_{type}_{id}_{encodedFilename}.{ext}         │
└────────────────────────────────────────────────────────────────────────┘
```

#### API Endpoints
- `GET /api/media`: Calls `ListObjectsV2`, decodes self-describing keys into `{ id, key, filename, type, size, uploadedAt }`, filters by category if requested, and signs temporary view URLs only for the current page.
- `GET /api/media/:key`: Resolves single media item and generates fresh presigned stream & download URLs (with `response-content-disposition: attachment` for downloads).
- `POST /api/upload/presign`: Validates Turnstile token, file size, MIME type, and bucket capacity. Generates self-describing key and presigned S3 `PutObject` URL for files $\le 10\text{ MB}$.
- `POST /api/upload/multipart/start`: Validates Turnstile token, initiates multipart upload via `CreateMultipartUpload`, returns `uploadId` and self-describing `key`.
- `POST /api/upload/multipart/sign-part`: Signs S3 `UploadPart` URL for a given part number.
- `POST /api/upload/multipart/complete`: Calls `CompleteMultipartUpload` with array of `{ PartNumber, ETag }`.
- `POST /api/upload/multipart/abort`: Calls `AbortMultipartUpload` on user cancellation.
- `GET /api/stats`: Calculates total bucket storage consumption and returns free space against `MAX_TOTAL_STORAGE_BYTES`.

---

### Implementation Phasing & Plan

1. **Backend S3 Client & Key Codec (`server/s3.ts`, `server/keyCodec.ts`)**:
   - Implement self-describing key encoder/decoder with inverted timestamps.
   - Configure AWS SDK S3 client with Backblaze credentials and endpoint.
   - Implement Turnstile token verification helper.
2. **API Route Handlers (`server/api/*.ts`)**:
   - `/api/media`: Listing, decoding, filtering, pagination, on-demand presigning.
   - `/api/media/resolve`: Dynamic permanent link resolver.
   - `/api/upload/*`: Single presign, multipart start, part signing, completion, abortion.
   - `/api/stats`: Storage utilization.
3. **Direct Multipart & Single Upload Client Pipeline (`src/utils/uploader.ts`)**:
   - 10 MB chunk slicer with concurrent part uploads (limit: 3) and exponential backoff retry.
   - ETag tracking and clean multipart completion or abort.
   - Real-time progress bars, upload speed calculation, cancel/retry handlers.
4. **Gallery, View Controls & Performance Optimization**:
   - High-density responsive media wall with lazy image loading.
   - Audio-muted video hover preview with immediate unmount on mouse leave (disabled on touch).
   - List view toggle with sorting (Newest/Oldest) and category filters (All, Images, Videos).
   - Client search across loaded items.
5. **Safe Media Lightbox & Permanent Link Experience**:
   - Fullscreen modal with native video player and zoomable image viewer.
   - Safe SVG sandboxing via isolated `<img>` components.
   - One-click copy permanent link (`/?v={key}`) and lossless original file download.
6. **Deployment & Verification**:
   - Comprehensive `README.md` with exact Backblaze B2 CORS rules (especially `ExposeHeaders: ["ETag"]`), Vercel deployment instructions, and local setup.
   - Complete `.env.example` with exact provided defaults.
   - Verification via `compile_applet`.
