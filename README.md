# FlareMedia

FlareMedia is a full-stack, anonymous image and video sharing platform backed entirely by a private Backblaze B2 bucket via its S3-compatible API.

- **Zero-Account Sharing**: Anyone can upload media, browse the public gallery, inspect technical metadata, and share permanent links without signing up.
- **Direct Client-to-B2 Transfers**: All single and multipart transfers bypass server memory using short-lived S3 presigned URLs.
- **S3 10 MB Multipart Slicing**: Large video files stream in 10 MB chunks with 3-worker concurrency and exponential backoff retry.
- **Uncompressed Originals**: Media files are 100% byte-preserved with zero transcoding or quality loss.
- **Durable Inverted-Key Indexing**: S3 objects use self-describing keys (`v1/{9999999999999-timestamp}_{type}_{id}_{filename}`) for instant chronological ordering without an external database.
- **Safe Vector Handling**: SVGs are rendered in sandboxed `<img>` contexts to block script execution.
- **Cloudflare Turnstile Support**: Built-in bot protection for upload endpoints.

---

## 1. Backblaze B2 Bucket Configuration (Mandatory)

### Bucket Privacy
Ensure your Backblaze B2 bucket is set to **Private**.
- Bucket Name: `Hmmmmmmmmm08`
- Endpoint: `https://s3.eu-central-003.backblazeb2.com`
- Region: `eu-central-003`

### CORS Rules
Backblaze B2 requires a CORS rule allowing the browser to send direct `PUT` requests and read the `ETag` header for multipart completion.

In the Backblaze B2 Web Console:
1. Navigate to **Buckets** > **Hmmmmmmmmm08** > **Bucket Settings** > **CORS Rules**.
2. Select **Custom CORS Rules** and paste the following configuration:

```json
[
  {
    "corsRuleName": "flaremedia-direct-upload",
    "allowedOrigins": [
      "*"
    ],
    "allowedOperations": [
      "s3_get",
      "s3_put",
      "s3_head",
      "s3_post"
    ],
    "allowedHeaders": [
      "*"
    ],
    "exposeHeaders": [
      "ETag"
    ],
    "maxAgeSeconds": 3600
  }
]
```

> **Note**: For production environments, replace `"allowedOrigins": ["*"]` with your specific Vercel deployment domain (e.g. `https://flaremedia.vercel.app`).
> **Critical**: `exposeHeaders: ["ETag"]` is mandatory for S3 multipart uploads to finalize correctly in the browser.

---

## 2. Environment Variables

Create a `.env` file (or set these in the Vercel Project Settings > Environment Variables):

| Variable | Description | Initial Value |
| :--- | :--- | :--- |
| `B2_ENDPOINT` | S3-compatible Backblaze endpoint | `https://s3.eu-central-003.backblazeb2.com` |
| `B2_REGION` | S3 region | `eu-central-003` |
| `B2_BUCKET` | Bucket name | `Hmmmmmmmmm08` |
| `B2_KEY_ID` | Application Key ID | `0030f9c02ff0e7a0000000003` |
| `B2_APPLICATION_KEY` | Backblaze Application Key Secret | *(Your secret key from Backblaze)* |
| `MAX_TOTAL_STORAGE_BYTES` | Hard ceiling for total bucket capacity | `9500000000` (~9.5 GB) |
| `APP_BASE_URL` | Base domain for links | `https://flaremedia.vercel.app` (or empty in dev) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile public site key | *(Optional in dev)* |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server secret | *(Optional in dev)* |

---

## 3. Local Development

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev
```

Visit `http://localhost:3000` to browse and upload media.

---

## 4. Vercel Deployment

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of FlareMedia"
   git branch -M main
   git remote add origin https://github.com/<your-username>/flaremedia.git
   git push -u origin main
   ```

2. In the Vercel Dashboard:
   - Click **Add New Project** and import the GitHub repository.
   - Framework Preset: **Vite**.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
   - Add all environment variables listed in Section 2 under **Settings** > **Environment Variables**.
   - Click **Deploy**.

The `vercel.json` and `api/[...path].ts` catch-all serverless configuration will automatically route all `/api/*` requests to the S3 presigning endpoints.

---

## 5. Security & Abuse Boundaries

- **Turnstile Verification**: Protects upload initiations from automated scrapers and bots.
- **Storage Quota**: The server checks aggregate storage consumption before issuing any presigned upload URL. When usage exceeds `MAX_TOTAL_STORAGE_BYTES`, uploads are rejected.
- **MIME & Size Validation**: Enforces strict image and video MIME types and limits individual uploads to 5 GB.
- **No Deletion API**: The public API exposes no deletion, modification, or bucket manipulation capabilities.
