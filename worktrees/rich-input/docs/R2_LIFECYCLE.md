# Cloudflare R2 Lifecycle Policy Setup

To enable auto-deletion of files after 365 days, you need to configure a Lifecycle Rule in the Cloudflare R2 Dashboard.

## Instructions

1.  **Log in to Cloudflare Dashboard**
    - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
    - Navigate to **R2** from the sidebar.

2.  **Select Your Bucket**
    - Click on the bucket used for this project (e.g., `motionify-deliverables`).

3.  **Go to Settings**
    - Click on the **Settings** tab.

4.  **Add Object Lifecycle Rule**
    - Scroll down to the **Object Lifecycle Rules** section.
    - Click **Add Rule**.

5.  **Configure Rule**
    - **Name**: `Auto-delete old files` (or similar).
    - **Rule details**:
        - **When**: Select "Age".
        - **Days**: Enter `365`.
        - **Action**: Select "Delete object".
    - **Filter** (Optional):
        - If you only want to delete temp files or beta files, you can add a prefix filter like `projects/*/beta/`.
        - If you want to delete ALL files after a year, leave the prefix empty.

6.  **Save**
    - Click **Add Rule** to save.

## Verification
- Once set, Cloudflare will automatically handle the deletion. There is no API action required from the application side.
