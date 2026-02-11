# Cloudflare R2 Setup Guide

## Why R2 for Motionify?

✅ **Zero egress fees** (downloading files is free!)
✅ **S3-compatible API** (easy to integrate)
✅ **Integrated CDN** (fast global delivery)
✅ **Cost-effective**: $0.015/GB storage + $4.50/million operations
✅ **No bandwidth charges** (huge savings for video files)

## Step 1: Create Cloudflare Account

1. Go to https://cloudflare.com
2. Click **"Sign Up"**
3. Verify email
4. Complete onboarding (you can skip adding a website for now)

## Step 2: Enable R2

1. In Cloudflare dashboard, click **"R2"** in left sidebar
2. Click **"Purchase R2 Plan"**
3. Select **"Free Plan"** (includes):
   - 10GB storage/month free
   - 1 million Class A operations/month free
   - 10 million Class B operations/month free
   - Zero egress fees ✅
4. Confirm plan

## Step 3: Create R2 Bucket

1. Click **"Create bucket"**
2. Configure bucket:
   - **Bucket name**: `motionify-pm-files`
   - **Location**: Automatic (Cloudflare auto-distributes globally)
3. Click **"Create bucket"**

## Step 4: Configure CORS for Direct Uploads

Direct client → R2 uploads require CORS configuration:

1. Select your bucket (`motionify-pm-files`)
2. Go to **"Settings"** tab
3. Scroll to **"CORS Policy"**
4. Click **"Edit"** and paste:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://portal.motionify.studio",
      "https://*.netlify.app"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

5. Click **"Save"**

## Step 5: Create API Token

1. In R2 dashboard, click **"Manage R2 API Tokens"**
2. Click **"Create API token"**
3. Configure token:
   - **Token name**: `motionify-pm-api`
   - **Permissions**:
     - ✅ Object Read & Write
     - ✅ Edit (for presigned URLs)
   - **Bucket scope**: Apply to specific bucket → `motionify-pm-files`
4. Click **"Create API token"**

5. **IMPORTANT**: Copy these values immediately (shown only once):

```
Access Key ID: [17-character string]
Secret Access Key: [43-character string]
```

Example:
```
Access Key ID: a1b2c3d4e5f6g7h8i
Secret Access Key: AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdefgh
```

## Step 6: Get R2 Bucket Endpoint

1. Go back to bucket overview
2. Copy **"S3 API endpoint"**:

```
https://[account-id].r2.cloudflarestorage.com
```

Example:
```
https://abc123xyz789.r2.cloudflarestorage.com
```

## Step 7: Configure Public Access (Optional - for CDN)

For serving files via CDN:

1. In bucket settings, scroll to **"Public access"**
2. Click **"Allow Access"**
3. Copy the **"Public R2.dev subdomain"**:

```
https://pub-[random-id].r2.dev
```

**Security Note**: Only final deliverables should use this. Use presigned URLs for private files.

## Step 8: Add Environment Variables

Add to your `.env` file:

```bash
# Cloudflare R2
R2_ACCOUNT_ID=abc123xyz789
R2_ACCESS_KEY_ID=a1b2c3d4e5f6g7h8i
R2_SECRET_ACCESS_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdefgh
R2_BUCKET_NAME=motionify-pm-files
R2_ENDPOINT=https://abc123xyz789.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-[random-id].r2.dev
```

## Step 9: Test Connection

Create a test script to verify setup:

```javascript
// test-r2-connection.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function testR2() {
  try {
    // Test upload
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: "test/hello.txt",
      Body: "Hello from Motionify PM Portal!",
      ContentType: "text/plain",
    };

    await R2.send(new PutObjectCommand(uploadParams));
    console.log("✅ Upload successful!");

    // Test presigned URL generation
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: "test/hello.txt",
    });

    const presignedUrl = await getSignedUrl(R2, getCommand, { expiresIn: 3600 });
    console.log("✅ Presigned URL generated:", presignedUrl);

    console.log("\n🎉 R2 setup complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testR2();
```

Run test:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
node test-r2-connection.js
```

## File Upload Strategy (Direct Client → R2)

### Backend (Netlify Function): Generate Presigned URL

```javascript
// netlify/functions/generate-upload-url.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function handler(event) {
  const { fileName, fileType, projectId } = JSON.parse(event.body);

  const R2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const key = `projects/${projectId}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });

  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl, key }),
  };
}
```

### Frontend: Upload File

```javascript
// Upload file directly to R2
async function uploadFile(file, projectId) {
  // 1. Get presigned URL from backend
  const response = await fetch("/api/generate-upload-url", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      projectId,
    }),
  });

  const { uploadUrl, key } = await response.json();

  // 2. Upload directly to R2 (bypasses backend)
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  // 3. Save file metadata to database
  await fetch("/api/files", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      fileName: file.name,
      fileSize: file.size,
      fileType: "final_deliverable",
      r2Key: key,
    }),
  });

  console.log("✅ File uploaded!");
}
```

## File Retention Automation

Create a scheduled Netlify Function for cleanup:

```javascript
// netlify/functions/scheduled-file-cleanup.js
export async function handler(event) {
  // Run daily: check files.deletion_scheduled_at
  // Delete from R2 if date has passed

  const filesToDelete = await db.query(`
    SELECT r2_key FROM files
    WHERE deletion_scheduled_at <= NOW()
    AND deleted_at IS NULL
  `);

  for (const file of filesToDelete) {
    await R2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: file.r2_key,
    }));

    await db.query(`
      UPDATE files SET deleted_at = NOW()
      WHERE r2_key = $1
    `, [file.r2_key]);
  }

  return { statusCode: 200 };
}
```

## Cost Estimation

**For 20 clients with smart retention:**

```
Storage:
- Active projects: 150GB
- Finals (180 days): 40GB
- Total: 190GB × $0.015 = $2.85/month

Operations:
- Uploads: 1000/month = $0.005
- Downloads: 10,000/month = FREE (zero egress!)
- Presigned URLs: negligible

Total: ~$3/month 🎉
```

## Security Best Practices

✅ **Never expose R2 credentials in frontend**
✅ **Always use presigned URLs for uploads/downloads**
✅ **Set expiration on presigned URLs (1-hour recommended)**
✅ **Validate file types and sizes in backend before generating URLs**
✅ **Use private buckets** (no public access unless needed)

## Troubleshooting

### CORS Errors
- Verify CORS policy includes your domain
- Check browser console for specific error
- Ensure OPTIONS requests are allowed

### Access Denied
- Verify API token has correct permissions
- Check bucket name matches environment variable
- Ensure endpoint URL is correct

### Upload Timeouts
- For files >2GB, use multipart uploads
- Increase client timeout settings
- Consider background uploads with progress tracking

## Next Steps

✅ R2 bucket created and configured
✅ CORS enabled for direct uploads
✅ API credentials secured
⬜ Implement file upload in frontend
⬜ Create scheduled cleanup function
⬜ Set up Amazon SES for emails

---

**Need Help?**
- R2 Docs: https://developers.cloudflare.com/r2/
- Cloudflare Discord: https://discord.gg/cloudflaredev
