# EduAItor — Google Play Console upload pack

Folder: `D:\Eduaitor\Frontend\google-play-upload`

Upload these into Play Console in this order.

## 1) Store listing text (`01-store-listing`)
| File | Play field | Limit |
|------|------------|-------|
| `title.txt` | App name | 30 chars |
| `short-description.txt` | Short description | 80 chars |
| `full-description.txt` | Full description | 4000 chars |
| `category-and-notes.txt` | Category helper | — |
| `translations/` | Hindi + 8 Indian languages (AI-ready paste pack) | — |

In Play Console you can also use **Add translations with AI**, then refine with files under `01-store-listing/translations/`.

## 2) Graphics (`02-graphics`) — required
| File | Spec |
|------|------|
| `app-icon-512.png` | **512 × 512** PNG (use this) |
| `app-icon-512-alternate-launcher.png` | optional alternate |
| `feature-graphic-1024x500.png` | **1024 × 500** PNG |

## 3) Phone screenshots (`03-screenshots-phone`) — min 2, up to 8
All are **1080 × 1920** (9:16):

1. `01-dashboard.png`
2. `02-attendance.png`
3. `03-students.png`
4. `04-fees.png`
5. `05-parent.png`
6. `06-reports.png`

## 4) Tablet screenshots (optional but recommended)
- `04-screenshots-tablet-7inch` → 1200 × 1920
- `05-screenshots-tablet-10inch` → 1920 × 1200

## 5) App binary (`06-release-bundle`)
- `eduaitor-internal-testing-v1.0.aab` ← **upload this** to Internal testing
- `eduaitor-debug.apk` = sideload test only (not for Play Console)
- See `INTERNAL-TESTING-STEPS.md` at the pack root

## First-time Play Console (2023+ policy)
1. Complete store listing + privacy policy URL
2. **Testing → Internal testing → Create new release**
3. Upload the `.aab`, start rollout
4. Add tester emails and open the join link
5. Production later may also need Closed testing (12 testers / 14 days) on personal accounts

## 6) Policy & contacts (`07-policy-and-contacts`)
- Privacy: https://www.eduaitor.com/privacy-policy
- Support: support@eduaitor.com
- Use `data-safety-notes.txt` when filling Data safety

## Play Console checklist
- [ ] Create app → package `eduaitor.app`
- [ ] Paste title / short / full description
- [ ] Upload app icon + feature graphic
- [ ] Upload at least 2 phone screenshots
- [ ] Set privacy policy URL
- [ ] Complete Content rating questionnaire
- [ ] Complete Data safety form
- [ ] Complete Target audience / Families if needed
- [ ] Upload signed `.aab` to Internal testing first
- [ ] Add testers → then promote to Production

## Notes
- Screenshots are marketing UI comps sized for Play (replace later with real device captures if you want).
- `_source` keeps original generated files — do not upload that folder.
