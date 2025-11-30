# Email Templates: File Management

This document specifies all email notifications for File Management (US-015, US-016).

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify`
- **Reply-To:** `hello@motionify.studio`
- **Format:** React Email templates (TSX components)

---

## Team Notification Emails

### 1. File Uploaded Notification

**Trigger:** New file uploaded to project
**To:** Project team members (excluding uploader)
**Subject:** `📄 New file uploaded: {{fileName}} - {{projectName}}`
**Template File:** `file-uploaded.tsx`

```
Hi {{recipientName}},

{{uploaderName}} just uploaded a new file to {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File Details:

• File Name: {{fileName}}
• Deliverable: {{deliverableName}}
• File Size: {{fileSize}}
• Uploaded by: {{uploaderName}}
• Description: {{description}}

                   ┌──────────────────┐
                   │   View File      │
                   └──────────────────┘
                   {{fileUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can download or preview this file in the project portal.

Questions? Reply to this email.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{recipientName}}` - Name of email recipient
- `{{uploaderName}}` - Name of person who uploaded file
- `{{fileName}}` - Original filename
- `{{projectName}}` - Project title
- `{{deliverableName}}` - Associated deliverable name
- `{{fileSize}}` - Human-readable file size (e.g., "142.5 MB")
- `{{description}}` - Optional file description
- `{{fileUrl}}` - Direct link to file in portal

**Conditions:**
- Only sent if file size > 10MB (optional threshold)
- Not sent to the uploader
- Can be disabled via notification preferences

---

### 2. Large File Upload Complete

**Trigger:** Large file (>100MB) upload completes
**To:** File uploader only
**Subject:** `✅ Upload complete: {{fileName}}`
**Template File:** `upload-complete.tsx`

```
Hi {{uploaderName}},

Your upload is complete!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: {{fileName}}
Size: {{fileSize}}
Project: {{projectName}}
Uploaded at: {{uploadedAt}}

The file has been successfully uploaded and is now available to the project team.

                   ┌──────────────────┐
                   │   View File      │
                   └──────────────────┘
                   {{fileUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{uploaderName}}` - Name of person who uploaded file
- `{{fileName}}` - Original filename
- `{{fileSize}}` - Human-readable file size
- `{{projectName}}` - Project title
- `{{uploadedAt}}` - Formatted timestamp
- `{{fileUrl}}` - Direct link to file

**Conditions:**
- Only sent for files > 100MB
- Optional feature (can be disabled)

---

### 3. File Access Expiring Soon

**Trigger:** 30 days before file expires (365 days after final delivery)
**To:** Project lead (PRIMARY_CONTACT)
**Subject:** `⚠️ File access expiring soon: {{projectName}}`
**Template File:** `file-expiring-soon.tsx`

```
Hi {{recipientName}},

File access for {{projectName}} will expire in {{daysRemaining}} days.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{fileCount}} files will no longer be accessible after {{expiryDate}}.

What happens next:
• Files will remain in storage but download links will stop working
• You can request extended access before the expiry date
• Contact us if you need to download files before they expire

                   ┌──────────────────┐
                   │  View Files      │
                   └──────────────────┘
                   {{projectUrl}}/files

                   ┌──────────────────┐
                   │ Request Extension│
                   └──────────────────┘
                   {{requestExtensionUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help? Reply to this email or contact us at hello@motionify.studio.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{recipientName}}` - Project lead name
- `{{projectName}}` - Project title
- `{{fileCount}}` - Number of expiring files
- `{{daysRemaining}}` - Days until expiry
- `{{expiryDate}}` - Formatted expiry date
- `{{projectUrl}}` - Link to project
- `{{requestExtensionUrl}}` - Link to request access extension

**Conditions:**
- Sent 30 days before expiry
- Only sent to PRIMARY_CONTACT
- Can request one-time extension

---

### 4. File Comment Notification (US-019 - Future)

**Trigger:** Someone comments on a file
**To:** File uploader and mentioned users
**Subject:** `💬 {{commenterName}} commented on {{fileName}}`
**Template File:** `file-comment.tsx`

```
Hi {{recipientName}},

{{commenterName}} left a comment on {{fileName}} in {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Comment:

"{{commentText}}"

                   ┌──────────────────┐
                   │   View & Reply   │
                   └──────────────────┘
                   {{commentUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{recipientName}}` - Comment recipient name
- `{{commenterName}}` - Person who commented
- `{{fileName}}` - File name
- `{{projectName}}` - Project title
- `{{commentText}}` - Comment content (truncated to 200 chars)
- `{{commentUrl}}` - Direct link to comment

**Conditions:**
- Sent to file uploader
- Sent to @ mentioned users
- Not sent to commenter

---

## Admin Notification Emails

### 5. File Deletion Notification

**Trigger:** File deleted by team member
**To:** Project managers
**Subject:** `🗑️ File deleted: {{fileName}} - {{projectName}}`
**Template File:** `file-deleted-admin.tsx`

```
Hi Admin,

A file was deleted from {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: {{fileName}}
Deliverable: {{deliverableName}}
Deleted by: {{deleterName}}
Deleted at: {{deletedAt}}

File can be restored within 30 days if needed.

                   ┌──────────────────┐
                   │  View Activity   │
                   └──────────────────┘
                   {{activityUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification.

Best regards,
The Motionify System

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{fileName}}` - Deleted file name
- `{{deliverableName}}` - Deliverable name
- `{{projectName}}` - Project title
- `{{deleterName}}` - Person who deleted file
- `{{deletedAt}}` - Timestamp
- `{{activityUrl}}` - Link to activity log

---

## Email Design Guidelines

### Styling

- **Font:** System font stack (Arial, Helvetica, sans-serif)
- **Text Color:** #333333 (body), #666666 (secondary)
- **Link Color:** #4A90E2 (Motionify brand blue)
- **Button:** Blue background (#4A90E2), white text, 8px border radius
- **Spacing:** 20px vertical rhythm
- **Max Width:** 600px

### Responsive

- Mobile-friendly (tested on iOS Mail, Gmail, Outlook)
- Single column layout
- Large tap targets (48px minimum)
- Readable font size (16px body)

### Accessibility

- WCAG 2.1 AA compliant
- Alt text for all images
- Semantic HTML structure
- High contrast text

---

## React Email Implementation

### Example Template (file-uploaded.tsx)

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface FileUploadedEmailProps {
  recipientName: string;
  uploaderName: string;
  fileName: string;
  projectName: string;
  deliverableName: string;
  fileSize: string;
  description?: string;
  fileUrl: string;
}

export default function FileUploadedEmail({
  recipientName,
  uploaderName,
  fileName,
  projectName,
  deliverableName,
  fileSize,
  description,
  fileUrl,
}: FileUploadedEmailProps) {
  const previewText = `${uploaderName} uploaded ${fileName} to ${projectName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📄 New File Uploaded</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          <Text style={text}>
            {uploaderName} just uploaded a new file to {projectName}.
          </Text>

          <Section style={detailsSection}>
            <Text style={detailLabel}>File Name:</Text>
            <Text style={detailValue}>{fileName}</Text>

            <Text style={detailLabel}>Deliverable:</Text>
            <Text style={detailValue}>{deliverableName}</Text>

            <Text style={detailLabel}>File Size:</Text>
            <Text style={detailValue}>{fileSize}</Text>

            <Text style={detailLabel}>Uploaded by:</Text>
            <Text style={detailValue}>{uploaderName}</Text>

            {description && (
              <>
                <Text style={detailLabel}>Description:</Text>
                <Text style={detailValue}>{description}</Text>
              </>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={fileUrl}>
              View File
            </Button>
          </Section>

          <Text style={footer}>
            Questions? Reply to this email.
            <br />
            <br />
            Best regards,
            <br />
            The Motionify Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 40px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const detailsSection = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#f7f7f7',
  borderRadius: '8px',
};

const detailLabel = {
  color: '#666',
  fontSize: '14px',
  marginBottom: '4px',
  fontWeight: '600',
};

const detailValue = {
  color: '#333',
  fontSize: '16px',
  marginBottom: '16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#4A90E2',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 0 0',
  borderTop: '1px solid #eee',
  paddingTop: '24px',
};
```

---

## Notification Preferences

Users can control file notification frequency:

- **Immediate**: Email sent immediately when file uploaded
- **Daily Digest**: Summary of file uploads once per day
- **Weekly Digest**: Summary of file uploads once per week
- **Disabled**: No email notifications for file uploads

Managed via `/settings/notifications` page (US-032).

---

## Email Sending Logic

### Batching

- File upload notifications batched for 5 minutes
- If 5+ files uploaded in quick succession, send single email
- Prevents email spam during bulk uploads

### Retry Logic

- 3 retry attempts with exponential backoff
- Failed emails logged to `email_failures` table
- Admin notified if >10 emails fail in 1 hour

### Unsubscribe

- All emails include unsubscribe link (footer)
- Unsubscribe preferences stored per-user
- Respects CAN-SPAM and GDPR requirements
