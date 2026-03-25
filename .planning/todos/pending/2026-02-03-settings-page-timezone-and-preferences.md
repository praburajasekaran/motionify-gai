---
created: 2026-02-03T20:10
title: Settings page - add timezone and preferences
area: ui
files: []
---

## Problem

The settings page needs improvement. It should include a timezone setting so users can see dates/times in their local timezone, along with other relevant user preferences. Currently the settings page likely lacks these configuration options, which affects UX for users in different time zones.

## Solution

TBD - Add timezone selector (dropdown of IANA timezones), and evaluate what other user preferences are relevant (e.g., notification preferences, date format, language). Store in users table or a separate user_preferences table.
