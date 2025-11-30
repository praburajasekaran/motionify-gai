#!/bin/bash

# ============================================================================
# Create Feature Documentation Template
# ============================================================================
# This script creates a complete feature documentation folder with all
# necessary files following the inquiry-to-project structure.
#
# Usage:
#   ./create-feature-docs.sh "feature-name" "Feature Display Name"
#
# Example:
#   ./create-feature-docs.sh "user-invitations" "User Team Invitations"
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check arguments
if [ "$#" -lt 2 ]; then
    print_error "Missing required arguments"
    echo ""
    echo "Usage: $0 <feature-slug> <Feature Display Name>"
    echo ""
    echo "Example:"
    echo "  $0 user-invitations \"User Team Invitations\""
    echo "  $0 deliverable-approval \"Deliverable Approval Workflow\""
    echo ""
    exit 1
fi

FEATURE_SLUG="$1"
FEATURE_NAME="$2"
FEATURE_DIR="./features/${FEATURE_SLUG}"
CURRENT_DATE=$(date +"%B %d, %Y")

# Validate feature slug format
if [[ ! "$FEATURE_SLUG" =~ ^[a-z0-9-]+$ ]]; then
    print_error "Feature slug must contain only lowercase letters, numbers, and hyphens"
    echo "Example: user-invitations, deliverable-approval, file-management"
    exit 1
fi

# Check if feature already exists
if [ -d "$FEATURE_DIR" ]; then
    print_warning "Feature directory already exists: $FEATURE_DIR"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborting..."
        exit 0
    fi
    rm -rf "$FEATURE_DIR"
fi

# Create feature directory
mkdir -p "$FEATURE_DIR"
print_success "Created directory: $FEATURE_DIR"

# ============================================================================
# Create README.md
# ============================================================================
cat > "$FEATURE_DIR/README.md" << 'EOF'
# FEATURE_NAME

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** CURRENT_DATE

## Overview

[Brief description of what this feature does and why it's needed]

## Customer Journey Summary

```
[High-level workflow steps]
Step 1 → Step 2 → Step 3 → Step 4
```

## Key Benefits

- **Benefit 1** - Description
- **Benefit 2** - Description
- **Benefit 3** - Description

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- Step-by-step customer journey
- State transition diagrams
- Workflow decision points
- Automation triggers

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Customer-facing:** [List screens]
- **Admin:** [List screens]
- **Portal:** [List screens]

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- [Model 1]
- [Model 2]
- [Model 3]

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- [Table 1]
- [Table 2]

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- X public endpoints
- Y admin endpoints
- Z webhook endpoints

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- X customer email templates
- Y admin notification templates

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- [Feature area 1]
- [Feature area 2]
- [Feature area 3]

### 8. [Open Questions](./08-open-questions.md)
Items requiring client decisions:
- Critical decisions
- Important decisions
- Optional enhancements

## Technical Requirements

### Frontend
- [Component 1]
- [Component 2]

### Backend
- [API endpoint 1]
- [API endpoint 2]

### Infrastructure
- [Service 1]
- [Service 2]

## Implementation Phases

1. **Phase 1:** [Description]
2. **Phase 2:** [Description]
3. **Phase 3:** [Description]

**Estimated Timeline:** X-Y weeks

## Success Metrics

- **Metric 1** - Description
- **Metric 2** - Description
- **Metric 3** - Description

## Related Documentation

- [Link to related docs]

## Questions or Feedback?

For questions about this feature specification, contact the product team.
EOF

# Replace placeholders in README
sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/README.md"
sed -i '' "s/CURRENT_DATE/$CURRENT_DATE/g" "$FEATURE_DIR/README.md"
print_success "Created README.md"

# ============================================================================
# Create 01-user-journey.md
# ============================================================================
cat > "$FEATURE_DIR/01-user-journey.md" << 'EOF'
# User Journey: FEATURE_NAME

## Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FEATURE WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: [Description]
    ↓
[Action or system process]
    ↓

STEP 2: [Description]
    ↓
[Action or system process]
    ↓

STEP 3: [Description]
    ↓
[Action or system process]
    ↓

[Add more steps as needed]
```

## State Transition Diagrams

### [Entity] Status Flow

```
┌─────────┐
│ STATE_1 │  ← Initial state
└────┬────┘
     │
     ↓
┌─────────┐
│ STATE_2 │  ← Next state
└────┬────┘
     │
     ↓
┌─────────┐
│ STATE_3 │  ← Final state
└─────────┘

Alternative paths:
┌─────────┐
│ ERROR   │  ← Error state
└─────────┘
```

## Decision Points

### User: [Decision Point Title]
```
[Question or choice]

OPTION A                    OPTION B
  │                           │
  ↓                           ↓
[Outcome A]               [Outcome B]
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type |
|--------------|------------|------------|
| [Event] | [Who] | [Template name] |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| [Event] | [Entity] → [New Status] |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| [Event] | [What happens] |

## Timeline Estimates

### Typical Flow
```
Day 0:   [Action]
Day 1:   [Action]
Day 2:   [Action]
         ↓
Total: X days
```

## Edge Cases & Error Handling

### [Edge Case Title]
- Description
- Expected behavior
- Resolution

### [Error Case Title]
- Description
- Expected behavior
- Recovery process
EOF

sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/01-user-journey.md"
print_success "Created 01-user-journey.md"

# ============================================================================
# Create 02-wireframes.md
# ============================================================================
cat > "$FEATURE_DIR/02-wireframes.md" << 'EOF'
# ASCII Wireframes: FEATURE_NAME

This document contains all user interface wireframes for the feature.

## Table of Contents

### Customer-Facing Screens
1. [Screen 1](#screen-1-title)
2. [Screen 2](#screen-2-title)

### Admin Screens
3. [Screen 3](#screen-3-title)
4. [Screen 4](#screen-4-title)

---

## Customer-Facing Screens

### SCREEN 1: [Title]

**Purpose:** [What this screen does]
**Route:** `/path`
**Authentication:** Required/None

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            [SCREEN TITLE]                                │
└─────────────────────────────────────────────────────────────────────────┘

[Screen content layout in ASCII art]

┌─────────────────────────────────────────────────────────────────────────┐
│ Field Label                                                               │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [Input field                                                      ] │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────┐
                        │  Action Button   │
                        └──────────────────┘
```

**Validation Rules:**
- Field 1: Required, format
- Field 2: Optional

**User Actions:**
- Action 1 → Result
- Action 2 → Result

**API Call:**
```
POST /api/endpoint
{
  "field": "value"
}
```

---

### SCREEN 2: [Title]

[Repeat format for each screen]

---

## Admin Screens

### SCREEN 3: [Title]

[Repeat format for admin screens]

---

## Design Notes

### Responsive Behavior
- Mobile: [Description]
- Tablet: [Description]
- Desktop: [Description]

### Accessibility
- All form fields have labels
- Keyboard navigation supported
- Screen reader compatible

### Loading States
- Show skeleton loaders
- Disable buttons during API calls

### Error Handling
- Inline validation errors
- Toast notifications for system errors
EOF

sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/02-wireframes.md"
print_success "Created 02-wireframes.md"

# ============================================================================
# Create 03-data-models.md
# ============================================================================
cat > "$FEATURE_DIR/03-data-models.md" << 'EOF'
# Data Models: FEATURE_NAME

This document defines all TypeScript interfaces and types for the feature.

## Table of Contents

1. [Main Model](#main-model)
2. [Supporting Models](#supporting-models)
3. [Supporting Types](#supporting-types)
4. [Relationships](#relationships)
5. [Validation Rules](#validation-rules)

---

## Main Model

Description of the primary data model.

```typescript
export interface MainModel {
  // Core Identification
  id: string;                    // UUID
  status: ModelStatus;
  createdAt: Date;
  updatedAt: Date;

  // Properties
  name: string;
  description?: string;

  // Relationships
  relatedId: string;             // UUID of related entity
}
```

### ModelStatus Type

```typescript
export type ModelStatus =
  | 'status_1'        // Description
  | 'status_2'        // Description
  | 'status_3';       // Description
```

---

## Supporting Models

### SupportingModel Interface

```typescript
export interface SupportingModel {
  id: string;
  name: string;
  value: number;
}
```

---

## Supporting Types

### Type Utilities

```typescript
export type MyType = string | number;

export const CONFIG = {
  OPTION_1: 'value1',
  OPTION_2: 'value2',
} as const;
```

---

## Relationships

### Entity Relationship Diagram

```
┌──────────┐
│ Entity A │
└────┬─────┘
     │
     │ 1:N
     │
     ↓
┌──────────┐
│ Entity B │
└──────────┘
```

---

## Validation Rules

### Main Model Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| name | Yes | 1 | 255 | Any string |
| email | Yes | - | - | Valid email |

### Validation Schema

```typescript
import { z } from 'zod';

export const MainModelSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
});
```

---

## Example Data

### Sample Instance

```typescript
const sample: MainModel = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  status: "status_1",
  createdAt: new Date("2025-01-11T14:30:00Z"),
  updatedAt: new Date("2025-01-11T14:30:00Z"),
  name: "Example",
  description: "Sample description",
  relatedId: "660e8400-e29b-41d4-a716-446655440001",
};
```
EOF

sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/03-data-models.md"
print_success "Created 03-data-models.md"

# ============================================================================
# Create 04-database-schema.sql
# ============================================================================
cat > "$FEATURE_DIR/04-database-schema.sql" << 'EOF'
-- ============================================================================
-- FEATURE_NAME - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: CURRENT_DATE
--
-- This schema defines the tables needed for the feature.
-- ============================================================================

-- ============================================================================
-- [TABLE_NAME] TABLE
-- ============================================================================
-- Description of what this table stores

CREATE TABLE IF NOT EXISTS table_name (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) NOT NULL DEFAULT 'status_1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Properties
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Relationships
  related_id UUID REFERENCES other_table(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('status_1', 'status_2', 'status_3')
  )
);

-- Create indexes for performance
CREATE INDEX idx_table_name_status ON table_name(status);
CREATE INDEX idx_table_name_created_at ON table_name(created_at DESC);
CREATE INDEX idx_table_name_related_id ON table_name(related_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_table_name_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_table_name_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE table_name IS 'Description of the table';
COMMENT ON COLUMN table_name.status IS 'Current status of the entity';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
EOF

sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/04-database-schema.sql"
sed -i '' "s/CURRENT_DATE/$CURRENT_DATE/g" "$FEATURE_DIR/04-database-schema.sql"
print_success "Created 04-database-schema.sql"

# ============================================================================
# Create 05-api-endpoints.md
# ============================================================================
cat > "$FEATURE_DIR/05-api-endpoints.md" << 'EOF'
# API Endpoints: FEATURE_NAME

This document specifies all REST API endpoints for the feature.

## Base URL

```
Production: https://api.motionify.studio
Development: http://localhost:3000
```

## Authentication

- **Public endpoints**: No authentication required
- **Admin endpoints**: Require JWT token in `Authorization: Bearer <token>` header

## Table of Contents

1. [Public Endpoints](#public-endpoints)
2. [Admin Endpoints](#admin-endpoints)
3. [Error Responses](#error-responses)

---

## Public Endpoints

### 1. [Endpoint Name]

Description of what this endpoint does.

```
POST /api/resource
```

**Authentication:** None

**Request Body:**
```json
{
  "field1": "value",
  "field2": "value"
}
```

**Validation:**
- `field1`: Required, format rules
- `field2`: Optional, format rules

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field": "value"
  },
  "message": "Success message"
}
```

**Side Effects:**
- Effect 1
- Effect 2

**Error Responses:**
- `400 Bad Request`: Validation failed
- `500 Internal Server Error`: Server error

---

## Admin Endpoints

### 2. [Admin Endpoint Name]

Description of admin endpoint.

```
GET /api/admin/resource
```

**Authentication:** Required (admin role)

**Query Parameters:**
- `status` (optional): Filter by status
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field": "fieldName",
    "details": {}
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 401 | `UNAUTHORIZED` | Missing/invalid auth token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 500 | `INTERNAL_ERROR` | Server error |
EOF

sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/05-api-endpoints.md"
print_success "Created 05-api-endpoints.md"

# ============================================================================
# Create 06-email-templates.md
# ============================================================================
cat > "$FEATURE_DIR/06-email-templates.md" << 'EOF'
# Email Templates: FEATURE_NAME

This document specifies all email notifications for the feature.

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify`
- **Reply-To:** `hello@motionify.studio`

## Customer Email Templates

### 1. [Email Template Name]

**Trigger:** [When this email is sent]
**To:** [Recipient]
**Subject:** `[Subject line with {{variables}}]`

```
Hi {{name}},

[Email body content with proper formatting]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Section heading if needed]

• Bullet point 1
• Bullet point 2

                        ┌──────────────────┐
                        │  [CTA Button]    │
                        └──────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

## Admin Email Templates

### 2. [Admin Email Template Name]

**Trigger:** [When this email is sent]
**To:** [Admin team]
**Subject:** `[CATEGORY] Subject`

```
[Admin email content]
```

---

## Email Design Guidelines

### Branding
- Plain text format for deliverability
- Professional, friendly tone

### Accessibility
- Clear subject lines (45-60 characters)
- Descriptive link text
- Good contrast for readability

### Variables

All templates support Handlebars syntax:
- `{{variableName}}` - Simple variable
- `{{#if condition}}...{{/if}}` - Conditional
- `{{#each items}}...{{/each}}` - Loop

### Testing

- Use Mailtrap for development
- Test all personalization variables
- Verify all links work
EOF

sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/06-email-templates.md"
print_success "Created 06-email-templates.md"

# ============================================================================
# Create 07-test-cases.md
# ============================================================================
cat > "$FEATURE_DIR/07-test-cases.md" << 'EOF'
# Test Cases: FEATURE_NAME

Comprehensive test scenarios for the feature. Total: XX test cases.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-###)
- **Feature**: Which component is being tested
- **Scenario**: What we're testing
- **Steps**: How to execute the test
- **Expected Result**: What should happen
- **Priority**: High/Medium/Low

---

## 1. [Feature Area] (X test cases)

### TC-001: [Test Case Title]
**Priority:** High
**Feature:** [Component Name]

**Steps:**
1. Step one
2. Step two
3. Step three

**Expected:**
- ✓ Result one
- ✓ Result two
- ✓ Result three

---

### TC-002: [Test Case Title]
**Priority:** Medium
**Feature:** [Component Name]

**Steps:**
1. Step one
2. Step two

**Expected:**
- ✓ Result one
- ✓ Result two

---

## 2. [Another Feature Area] (Y test cases)

[Continue pattern]

---

## Test Execution Guidelines

### Test Environments
- **Local**: Development with test database
- **Staging**: Pre-production
- **Production**: Limited testing

### Test Data
- Use `@test.motionify.studio` emails
- Clear test data between runs

### Automation
- Unit tests: All validation logic
- Integration tests: API endpoints
- E2E tests: Critical user flows

### Regression Testing
Run full test suite after:
- Database schema changes
- API endpoint modifications
- Major feature updates
EOF

sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/07-test-cases.md"
print_success "Created 07-test-cases.md"

# ============================================================================
# Create 08-open-questions.md (OPTIONAL - uncomment if needed)
# ============================================================================
# NOTE: Only create this file if there are actual open questions that need
# client decisions. Most features have clear requirements and don't need this.
#
# To enable, uncomment the code block below:

# cat > "$FEATURE_DIR/08-open-questions.md" << 'EOF'
# # Open Questions: FEATURE_NAME
#
# This document contains questions requiring client decisions before implementation.
#
# ## Status Key
# - 🔴 **CRITICAL** - Blocks implementation
# - 🟡 **IMPORTANT** - Affects scope/timeline
# - 🟢 **OPTIONAL** - Nice to have
#
# ---
#
# ## 1. [Category]
#
# ### Q1.1: [Question Title] 🔴
# **Question:** [The actual question?]
#
# **Options:**
# - **A)** [Option description]
# - **B)** [Option description]
# - **C)** [Option description]
#
# **Impact:**
# - [Impact of each option]
#
# **Recommendation:** [Your recommendation]
#
# **Decision:** _________________
#
# ---
#
# ## ✅ Decisions Made: [Date]
#
# ### Critical Decisions (Implementation Blockers)
# - **Q1.1:** ✅ [Decision made]
#
# ### Important Decisions (Affects Scope/Timeline)
# - Status: **Pending stakeholder review**
#
# ---
#
# ## Next Steps
#
# 1. **Review all 🔴 CRITICAL questions** first
# 2. **Review 🟡 IMPORTANT questions** that affect timeline
# 3. **Defer or reject 🟢 OPTIONAL questions** for post-MVP
# 4. **Document decisions** in this file
# 5. **Update other docs** to reflect decisions
# 6. **Begin implementation** with clear requirements
# EOF
#
# sed -i '' "s/FEATURE_NAME/$FEATURE_NAME/g" "$FEATURE_DIR/08-open-questions.md"
# print_success "Created 08-open-questions.md"

print_info "Skipped 08-open-questions.md (create manually if needed)"

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Feature Documentation Created Successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Feature:${NC} $FEATURE_NAME"
echo -e "${BLUE}Location:${NC} $FEATURE_DIR"
echo ""
echo -e "${YELLOW}Files created:${NC}"
echo "  1. README.md"
echo "  2. 01-user-journey.md"
echo "  3. 02-wireframes.md"
echo "  4. 03-data-models.md"
echo "  5. 04-database-schema.sql"
echo "  6. 05-api-endpoints.md"
echo "  7. 06-email-templates.md"
echo "  8. 07-test-cases.md"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. cd $FEATURE_DIR"
echo "  2. Review and customize each file"
echo "  3. Fill in specific details for your feature"
echo "  4. Remove placeholder text"
echo "  5. Add actual wireframes, data models, etc."
echo ""
echo -e "${GREEN}Happy documenting! 📝${NC}"
echo ""

# Send notification (macOS only)
if command -v terminal-notifier &> /dev/null; then
    terminal-notifier -title "Feature Docs Created ✅" -message "Created documentation for: $FEATURE_NAME"
fi
