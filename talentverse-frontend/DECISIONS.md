# TalentVerse — Decisions & Flow

## Personality Model
- Core model: Big Five (OCEAN) — scientific + continuous scores
- UX Layer: simple label derived from Big Five (not MBTI)
- Storage keys:
  - big5_completed = "true|false"
  - profile_completed = "true|false"
  - big5_percent = JSON of O,C,E,A,N percentages
  - personality_label = string

## Onboarding Flow
1) Register/Login
2) Big Five Test: /big5
3) Big Five Results: /big5-results
4) Profile: /profile
5) Dashboard: /dashboard

## API
- Use apiFetch from src/config/api.js
- Base: REACT_APP_API_BASE or http://localhost:5000
