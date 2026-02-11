#!/bin/bash

# Motionify PM Portal - Obsolete Documentation Cleanup Script
# Created: 2026-01-12
# 
# This script moves obsolete/duplicate markdown files to an archive directory.
# Run with --dry-run to see what would be moved without actually moving files.
# Run with --delete to permanently delete instead of archiving.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE_DIR="$PROJECT_ROOT/.archived-docs"
DRY_RUN=false
DELETE_MODE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --delete)
            DELETE_MODE=true
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Motionify Docs Cleanup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if $DRY_RUN; then
    echo -e "${YELLOW}DRY RUN MODE - No files will be moved/deleted${NC}"
    echo ""
fi

if $DELETE_MODE; then
    echo -e "${RED}DELETE MODE - Files will be permanently deleted!${NC}"
    echo ""
fi

# Create archive directory if not in delete mode
if ! $DRY_RUN && ! $DELETE_MODE; then
    mkdir -p "$ARCHIVE_DIR"
    echo -e "${GREEN}Archive directory: $ARCHIVE_DIR${NC}"
    echo ""
fi

# Function to move or delete a file/directory
cleanup_item() {
    local item="$1"
    local reason="$2"
    
    if [ -e "$PROJECT_ROOT/$item" ]; then
        echo -e "${YELLOW}[$reason]${NC} $item"
        
        if ! $DRY_RUN; then
            if $DELETE_MODE; then
                rm -rf "$PROJECT_ROOT/$item"
            else
                # Create parent directories in archive
                mkdir -p "$ARCHIVE_DIR/$(dirname "$item")"
                mv "$PROJECT_ROOT/$item" "$ARCHIVE_DIR/$item"
            fi
        fi
    fi
}

echo -e "${RED}=== DUPLICATE FEATURE SPECS (Largest cleanup) ===${NC}"
echo "The features/pending/ directory duplicates docs/features/"
echo ""

# The entire features/pending directory is a duplicate
if [ -d "$PROJECT_ROOT/features/pending" ]; then
    cleanup_item "features/pending" "DUPLICATE"
fi

echo ""
echo -e "${RED}=== OUTDATED MILESTONE SUMMARIES ===${NC}"
echo "These document completed phases that are no longer relevant"
echo ""

cleanup_item "docs/PHASE_1_COMPLETE_SUMMARY.md" "OBSOLETE"

echo ""
echo -e "${RED}=== REDUNDANT TESTING GUIDES ===${NC}"
echo "Superseded by MOTIONIFY-PORTAL-TEST-CASES.md"
echo ""

cleanup_item "TESTING-GUIDE.md" "REDUNDANT"
cleanup_item "PHASE_2_TESTING_GUIDE.md" "REDUNDANT"
cleanup_item "MANUAL_TESTING_GUIDE.md" "REDUNDANT"
cleanup_item "docs/testing/QUICK-TEST-CHECKLIST.md" "REDUNDANT"

echo ""
echo -e "${RED}=== REDUNDANT SETUP/QUICK START DOCS ===${NC}"
echo "Info covered in main QUICK_START.md"
echo ""

cleanup_item "START_SERVERS.md" "REDUNDANT"
cleanup_item "USING_STATE_MANAGEMENT.md" "REDUNDANT"
cleanup_item "BACKEND_INTEGRATION_GUIDE.md" "REDUNDANT"
cleanup_item "TEST_PROPOSAL_LINK.md" "TEMPORARY"

echo ""
echo -e "${RED}=== REDUNDANT DEPLOYMENT GUIDES ===${NC}"
echo "Keep docs/PRODUCTION_DEPLOYMENT.md and docs/netlify-deployment.md"
echo ""

cleanup_item "DEPLOYMENT_GUIDE.md" "REDUNDANT"

echo ""
echo -e "${RED}=== OUTDATED STATUS TRACKERS ===${NC}"
echo "These have outdated percentages/checkboxes"
echo ""

cleanup_item "docs/E2E_TESTING.md" "OUTDATED"
cleanup_item "docs/CHANGES_LOG.md" "OUTDATED"

echo ""
echo -e "${GREEN}========================================${NC}"

if $DRY_RUN; then
    echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
    echo "Run without --dry-run to actually move files to archive"
    echo "Run with --delete to permanently delete files"
else
    if $DELETE_MODE; then
        echo -e "${RED}FILES PERMANENTLY DELETED${NC}"
    else
        echo -e "${GREEN}FILES MOVED TO: $ARCHIVE_DIR${NC}"
        echo ""
        echo "To restore a file:"
        echo "  mv $ARCHIVE_DIR/<file> $PROJECT_ROOT/<file>"
        echo ""
        echo "To permanently delete the archive:"
        echo "  rm -rf $ARCHIVE_DIR"
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Cleanup Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Files/directories processed:"
echo "  - features/pending/ (13 subdirs, ~100 files)"
echo "  - 12 individual obsolete markdown files"
echo ""
echo -e "${GREEN}Files KEPT (still relevant):${NC}"
echo "  - README.md"
echo "  - QUICK_START.md"
echo "  - docs/MOTIONIFY-PORTAL-TEST-CASES.md"
echo "  - docs/QUICK_START.md"
echo "  - docs/setup-*.md (infrastructure guides)"
echo "  - docs/PRODUCTION_DEPLOYMENT.md"
echo "  - docs/netlify-deployment.md"
echo "  - docs/CODING_CONVENTIONS.md"
echo "  - docs/PERMISSION_MATRIX.md"
echo "  - docs/user-types-permissions.md"
echo "  - docs/SCOPED_OUT_FEATURES.md"
echo "  - scripts/ralph/ (active tracking)"
echo ""
echo -e "${YELLOW}Files that need MANUAL UPDATE:${NC}"
echo "  - VERTICAL_SLICE_PLAN.md (mark all phases complete)"
echo "  - docs/FEATURE_STATUS_MATRIX.md (update percentages)"
echo "  - docs/IMPLEMENTATION_PLAN.md (check checkboxes)"
echo "  - IMPLEMENTATION_COMPLETE.md (review relevance)"
