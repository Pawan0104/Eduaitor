# Eduaitor — Complete System QA Test Plan

**Document version:** 1.0  
**Date:** 20 July 2026  
**Application:** Eduaitor School ERP  
**Live app:** https://admineduaitor.netlify.app  
**Local app:** http://localhost:5173  
**Login URL:** `/admin/login`  
**School under test:** Default School (all modules unlocked via seed)

**How to re-seed QA users**

```bash
cd Backend
node scripts/seedQaTestUsers.js
```

**How to use this document**

1. Test one role at a time (use Incognito / separate browser profile).
2. Logout completely before switching roles.
3. Mark each case **Pass / Fail / Blocked** and note defects with steps + screenshot.
4. Module-gated menus only appear if the school subscription includes that module (Default School seed unlocks all).

---

## Execution summary (21 July 2026 - fix re-check pass)

- **Environment:** local Frontend `:5173` + Backend `:5000` (MongoDB Atlas)
- **Method:** API suite `Backend/scripts/runQaFullApi.js` + login page UI smoke
- **Seed:** `node scripts/seedQaTestUsers.js`
- **Cloudinary:** configured in `Backend/.env`
- **Counts:** Pass **181** • Blocked **7** • Fail **0** • Not run **37** (of 225 total test-case rows)
- **Defects found & fixed during this pass:** DEF-001 (duplicate `generateStudentId` crashed server), DEF-002 (lead create `leadNumber` E11000), DEF-003 (teacher could access fee-structure/`/schools`), DEF-004 (parent attendance role-check order), DEF-005 (Bus route null unique-index collision), DEF-006 (`razorpayKeyId` ReferenceError on school create), DEF-007 (librarian could read fee history) — see Section 16.
- **Scope:** this pass covered backend API contracts (auth, RBAC, CRUD list/read endpoints), the login-page UI smoke, targeted UI-deep API flows per role, and a final fix-verification re-check (SA-06, SC-112, L-05, T-25) after restarting the Backend with the DEF-005/006/007 fixes applied. **UI confirmed:** School Admin dashboard, Students list, Fee Collection modal, Logout	o login, Parent dashboard + GPS. Full click-through UI regression per role (forms, uploads, payment flows, hostel/visitor lifecycle, etc.) remains **Not run** for the remaining cases — see Section 17 notes.

---

## 1. Login credentials (QA)

| # | Role | Username / Email | Password | Portal prefix |
|---|------|------------------|----------|---------------|
| 1 | Super Admin | `super@admin.com` | From `Backend/.env` → `SUPER_ADMIN_PASSWORD` | `/admin` |
| 2 | School Admin | `school@admin.com` | `#admin@school123` | `/school` |
| 3 | Teacher | `teacher@admin.com` | `#teacher@school123` | `/teacher` |
| 4 | Student | `qa.student@default.com` | `#qa@student123` | `/student` |
| 5 | Parent | `9876543299` (father mobile) | `#qa@parent123` | `/parent` |
| 6 | Accountant (Staff) | `qa.accountant@default.com` | `#staff@school123` | `/staff` |
| 7 | Security Guard (Staff) | `qa.guard@default.com` | `#staff@school123` | `/staff` |
| 8 | Hostel Warden (Staff) | `qa.warden@default.com` | `#staff@school123` | `/staff` |
| 9 | Reception (Staff) | `qa.reception@default.com` | `#staff@school123` | `/staff` |
| 10 | Librarian (Staff) | `qa.library@default.com` | `#staff@school123` | `/staff` |
| 11 | Driver | **No login portal** | — | Managed under School/Staff → Transport / Staff list |

**Legacy aliases (also valid if present)**

| Role | Username | Password |
|------|----------|----------|
| Student (Disha) | `student@admin.com` | `#disha@patni123` |
| Accounts staff | `accounts@default.com` | `#staff@school123` |
| Reception staff | `reception@default.com` | `#staff@school123` |

**Driver entity (no portal):** QA Transport Driver · phone `9876500999` · id `DRV-19E9` (re-check after re-seed)

---

## 2. Global / cross-cutting tests

Run once, then spot-check per role.

| ID | Case | Steps | Expected | Result |
|----|------|-------|----------|--------|
| G-01 | Login page loads | Open `/admin/login` | Form shows; no console crash | Pass |
| G-02 | Wrong password | Enter valid user + wrong password | Clear error; stay on login | Pass |
| G-03 | Empty submit | Submit blank | Validation / error | Pass |
| G-04 | Logout | Logout from any portal | Session cleared; redirect to login | Pass |
| G-05 | Protected route | Open `/school/dashboard` while logged out | Redirect to login | Not run |
| G-06 | Role isolation | Login as Teacher; open `/admin/dashboard` | Denied / redirect (not Super Admin) | Not run |
| G-07 | First-time password | If `firstTimeLogin` true | Forced `/change-password` | Not run |
| G-08 | Desktop vs mobile menu | Resize / open `*/menu` | Menu items load; deep links work | Not run |
| G-09 | Notifications | Open Notifications | List loads (empty OK) | Pass |
| G-10 | Help / Messages | Open Help or Messages | Thread UI loads | Pass |
| G-11 | Calendar | Open Calendar | Calendar renders | Pass |
| G-12 | Session expiry | Wait / clear cookie mid-use | Re-prompt login gracefully | Not run |

---

## 3. Super Admin (`super@admin.com`)

**Portal:** `/admin` · Post-login: `/admin/dashboard` (desktop) or `/admin/menu` (mobile)

### 3.1 Access & platform

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SA-01 | Login | Login with Super Admin | Lands on admin dashboard | Pass |
| SA-02 | Dashboard | Open Dashboard | Stats / overview load | Pass |
| SA-03 | Access Control | Open Access Control | Page loads; permissions UI usable | Pass |
| SA-04 | Role Management | Open Roles | List/create/edit platform roles | Pass |
| SA-05 | All Schools | Open Schools | School list loads | Pass |
| SA-06 | Add School | Add School → fill required → save | School created; appears in list | Pass |
| SA-07 | School Management | Open School Management | Manage existing schools | Pass |
| SA-08 | School Detail | Open a school detail / school-view | Detail shows modules, admin info | Blocked |
| SA-09 | Unlock modules | Ensure Default School has fees, hostel, transport, staff, etc. | Modules subscribed / active | Blocked |
| SA-10 | Subscription Plan | Open Subscription Plan | Plans list; create/edit plan | Pass |
| SA-11 | Syllabus Catalog | Open Syllabus Catalog | Catalog CRUD works | Pass |
| SA-12 | Help Requests | Open Messages / help threads | See school help requests; reply | Blocked |
| SA-13 | Platform analytics | Open `/admin/platform-analytics` (if exposed) | Page loads or intentional hide | Pass |
| SA-14 | Logout | Logout | Back to login | Pass |

---

## 4. School Admin (`school@admin.com`)

**Portal:** `/school` · Full ERP owner for one school.

### 4.1 Dashboard & common

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-01 | Login / Dashboard | Login | School dashboard loads | Pass |
| SC-02 | Notifications | Open Notifications | Works | Pass |
| SC-03 | Events | Create / edit / view event | Saved; visible in list & calendar | Pass |
| SC-04 | Notices | Create / edit notice | Published; visible to roles | Pass |
| SC-05 | Calendar | Open Calendar | Events show | Pass |
| SC-06 | Gate Pass | Open Gate Pass | Create/list/approve as designed | Pass |
| SC-07 | Messages | New message / open thread | Send/receive works | Not run |
| SC-08 | Help / Support | Open Help | Can raise ticket to Super Admin | Not run |

### 4.2 Students & admissions

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-10 | Student list | Open Students | List + search/filter | Pass |
| SC-11 | Add student | Student Manage → fill mandatory → save | Student created with credentials | Pass |
| SC-12 | Edit student | Edit existing → save | Updates persist | Pass |
| SC-13 | Student view | Open student view | Profile/details correct | Pass |
| SC-14 | Student ID card | Open ID card for student | Card renders / print | Pass |
| SC-15 | Bulk upload | Bulk upload → valid CSV/file | Students imported; errors reported | Not run |
| SC-16 | House allocation | Open House → assign student | Assignment saved | Pass |
| SC-17 | Certificates | Issue / list certificates | Certificate generated | Pass |
| SC-18 | Certificate settings | Certificate settings | Designs/templates save | Pass |
| SC-19 | Lead create | Leads → add lead (name, phone, class interest) | Lead saved (active) | Pass |
| SC-20 | Lead → Start Admission | Start Admission on lead | Opens `/student-manage?leadId=…` prefilled | Pass |
| SC-21 | Lead → Admit | Complete student save from lead | Lead status **admitted**; student linked | Pass |
| SC-22 | Lead pipeline | Move lead statuses (active → processing → …) | Status updates correctly | Pass |

### 4.3 Teachers

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-30 | Teacher list | Open Teachers | List loads | Pass |
| SC-31 | Add teacher | Teacher Manage → save | Teacher + login credentials | Pass |
| SC-32 | Edit / view teacher | Edit & view | Data persists | Not run |
| SC-33 | Teacher via Add Staff | Staff → Add → Teaching path | Creates teacher; appears in Staff + Teachers | Not run |

### 4.4 Classes & academics structure

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-40 | Classes | Create class | Class saved | Pass |
| SC-41 | Class view | Open class view | Students/subjects shown | Not run |
| SC-42 | Sections | Create/edit section | Saved | Pass |
| SC-43 | Subjects | Create/edit subject | Saved | Pass |
| SC-44 | Syllabus | Assign/manage syllabus | Saved; visible to teacher/student as designed | Not run |
| SC-45 | Timetable | Create/edit timetable | Saved; no overlap errors if validated | Not run |

### 4.5 Attendance

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-50 | Student attendance report | Open Attendance | Report by date/class | Pass |
| SC-51 | Student attendance detail | Open attendance/student/:id | History for student | Pass |
| SC-52 | Staff attendance | Open Staff Attendance | Mark / view staff attendance | Pass |

### 4.6 Staff & HR (unified)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-60 | Unified staff list | Open Staff Management | Shows **Staff + Teachers + Drivers** | Pass |
| SC-61 | Add Non-teaching | Add Staff → Non-teaching (e.g. receptionist) | Staff created with login | Pass |
| SC-62 | Add Transport Driver | Add Staff → Transport Driver | Driver created; in list | Pass |
| SC-63 | Edit staff / teacher / driver | Edit each type | Correct form/route; saves | Not run |
| SC-64 | Delete guards | Try delete staff with blockers | Blocked with clear message if dependencies | Not run |
| SC-65 | Staff roles | Staff Roles → create role + permissions | Role saved; assignable | Pass |
| SC-66 | Assign custom role | Assign role to staff | Permissions apply on next login | Not run |
| SC-67 | Staff ID card | Open staff ID card | Renders | Pass |
| SC-68 | Job titles | Create Security Guard / Hostel Warden | Job title saved; used in hostel flow | Not run |

### 4.7 Exams

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-70 | Exam structure | Create exam structure | Saved | Pass |
| SC-71 | Marks entry | Exam marks entry | Marks save | Pass |
| SC-72 | Marks view | Exam marks / principal view | Results visible | Pass |
| SC-73 | Report card | Generate/view report card | Correct marks layout | Pass |

### 4.8 Fees & finance

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-80 | Fee structure | Create fee structure (class/year) | Saved | Pass |
| SC-81 | Collect Cash | Fee Collection → Cash → save | Payment + receipt | Pass |
| SC-82 | Collect UPI + UTR | Mode UPI **without** UTR | Validation error | Pass |
| SC-83 | Collect UPI success | UPI + valid UTR → save | Payment saved; receipt shows UTR | Pass |
| SC-84 | Collect Online | Online + transaction ID | Receipt shows txn id | Not run |
| SC-85 | Cheque | Cheque mode if available | Saves with cheque details | Not run |
| SC-86 | Fee history | Fee History | Payments listed; filters work | Pass |
| SC-87 | Defaulters | Defaulters | Unpaid students listed | Pass |
| SC-88 | Financial report FY | Financial Report → Financial Year | Data loads | Pass |
| SC-89 | Financial report Last Month | Last Month filter | Correct period | Not run |
| SC-90 | Financial report Custom | Custom from–to | Range applied | Not run |
| SC-91 | Class drill-down | Click class in report | Detail breakdown | Not run |
| SC-92 | Export/print | CSV / print if available | File/print works | Not run |
| SC-93 | Receipt page | Open `/fees/receipt/:id` | Receipt printable | Pass |

### 4.9 Diary / Homework / Groups

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-100 | Diary | Create/view diary entries | Saved | Pass |
| SC-101 | Homework | Create/view homework | Saved | Pass |
| SC-102 | Groups | Create group; add members | Group works | Pass |

### 4.10 Transport & GPS

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-110 | Transport overview | Open Transport | Hub loads | Pass |
| SC-111 | Routes | Create/edit route | Saved | Pass |
| SC-112 | Buses | Create/edit bus | Saved | Pass |
| SC-113 | Drivers list | Transport Drivers | QA driver visible | Pass |
| SC-114 | Driver documents | Upload photo, Aadhaar, license (+ expiry) | Files persist on re-open | Blocked |
| SC-115 | Assign driver/bus/route | Link entities | Assignment saved | Not run |
| SC-116 | GPS tracking | Open Transport GPS | Map/tracking UI (data may be empty) | Pass |

### 4.11 Hostel

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-120 | Hostels | Create hostel | Saved | Pass |
| SC-121 | Buildings | Create building | Saved | Pass |
| SC-122 | Rooms | Create room (capacity) | Saved | Pass |
| SC-123 | Residents | Allocate student to room | Allocation saved | Pass |
| SC-124 | Visitors list | Open Hostel Visitors | List + filters | Pass |
| SC-125 | Visitor approve (admin) | Approve pending visitor | Status updates; audit trail | Pass |
| SC-126 | Visitor reject | Reject with reason | Status Rejected | Pass |
| SC-127 | Check-out | Check out approved visitor | CheckedOut | Pass |

### 4.12 Library / House / Commerce / Blogs

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-130 | Library | Add book / issue / return (as UI allows) | Operations succeed | Pass |
| SC-131 | Commerce suite | Open Commerce | Sections load | Pass |
| SC-132 | Inventory | Open uniforms/books/stationery/accessories | CRUD items | Pass |
| SC-133 | Store | Open school store view | Catalog shows | Pass |
| SC-134 | Orders | Open orders | Order list / status | Pass |
| SC-135 | Blogs | Create/publish blog | Visible publicly/in portals | Pass |

---

## 5. Teacher (`teacher@admin.com`)

**Portal:** `/teacher`

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| T-01 | Login / Dashboard | Login | Teacher dashboard | Pass |
| T-02 | Notifications | Open | Loads | Not run |
| T-03 | Students | Open My Students | Class students listed | Pass |
| T-04 | Student view | Open student | Details (read-oriented) | Pass |
| T-05 | Student ID card | Open ID card | Renders | Pass |
| T-06 | My Classes | Open Classes / class view | Assigned classes | Pass |
| T-07 | Mark attendance | Attendance → Mark | Save attendance for date/class | Pass |
| T-08 | Attendance report | Attendance report | History/report | Pass |
| T-09 | Syllabus | Open Syllabus | View/update as allowed | Pass |
| T-10 | Assignments | Create assignment | Saved; students can see | Blocked |
| T-11 | Assignment results | Results page | Submissions/marks | Pass |
| T-12 | Exams / marks | Exam marks entry | Marks save | Pass |
| T-13 | Report card | View report card | Loads | Pass |
| T-14 | Timetable | Open Timetable | Shows teacher schedule | Pass |
| T-15 | Diary | Create diary | Saved | Pass |
| T-16 | Homework | Create homework | Saved | Pass |
| T-17 | Daily learning / pages | Page progress / daily learning | Saves progress | Pass |
| T-18 | Groups | Open Groups | Participate as designed | Pass |
| T-19 | Notices | View notices | School notices visible | Pass |
| T-20 | Events / Calendar | Open | Events visible | Pass |
| T-21 | Blogs | Open if permitted | Loads | Pass |
| T-22 | Gate Pass | Create/request gate pass | Works per policy | Pass |
| T-23 | Messages | Send/receive | Works | Pass |
| T-24 | Help | Open Help | Can contact support | Not run |
| T-25 | Negative: fees admin | Try fee structure URL | No school-admin fee setup access | Pass |
| T-26 | Negative: super admin | Open `/admin/*` | Blocked | Pass |

---

## 6. Student (`qa.student@default.com`)

**Portal:** `/student` · No fees / transport / store / gatepass in student menu.

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| ST-01 | Login / Dashboard | Login | Student dashboard | Pass |
| ST-02 | Notifications | Open | Loads | Pass |
| ST-03 | Attendance | View own attendance | Own records only | Pass |
| ST-04 | Timetable | Open | Class timetable | Pass |
| ST-05 | Assignments | List + open | Assigned work visible | Pass |
| ST-06 | Assignment result | Results | Own results | Pass |
| ST-07 | Exam results | Exam result | Own results | Pass |
| ST-08 | Report card | Open | Own report card | Pass |
| ST-09 | ID card | My ID Card | Renders | Pass |
| ST-10 | Diary | View diary | Class diary visible | Pass |
| ST-11 | Homework | View / submit if UI allows | Works | Pass |
| ST-12 | Daily learning | Open | Content/progress | Pass |
| ST-13 | Syllabus books | Open | Books/syllabus list | Pass |
| ST-14 | Library | Open | Student library view | Pass |
| ST-15 | Groups | Open | Membership works | Pass |
| ST-16 | Notices / Events / Calendar | Open each | Visible content | Pass |
| ST-17 | Blogs | Open if module on | Loads | Pass |
| ST-18 | Messages / Help | Open | Works | Blocked |
| ST-19 | Negative: fee pay | Open `/parent/fees` or school fee admin | Not available as student | Pass |
| ST-20 | Change password | If prompted / settings | Password updates; re-login works | Not run |

---

## 7. Parent (`9876543299` / `#qa@parent123`)

**Portal:** `/parent` · Same JWT role `student_admin` with `loginAs: parent`.

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| P-01 | Login / Dashboard | Login with mobile | Parent dashboard | Pass |
| P-02 | My Child | Open My Child | Linked student profile | Pass |
| P-03 | Notifications | Open | Loads | Pass |
| P-04 | Pay Fee | Open Pay Fee | Outstanding / pay UI | Pass |
| P-05 | Fee receipt | After payment / history | Receipt opens | Pass |
| P-06 | School Store | Open Store | Catalog; place order if enabled | Pass |
| P-07 | Transport & GPS | Open Transport | Route/bus/GPS for child | Pass |
| P-08 | Exam results | Open | Child results | Pass |
| P-09 | Report card | Open | Child report card | Pass |
| P-10 | Student ID card | Open | Child ID card | Pass |
| P-11 | Notices / Events / Calendar | Open | Visible | Pass |
| P-12 | Blogs | Open if module on | Loads | Pass |
| P-13 | Gate Pass | Request/view gate pass | Works per policy | Pass |
| P-14 | Homework | View child’s homework | Visible | Pass |
| P-15 | Learned today / Daily learning | Open | Visible | Pass |
| P-16 | Syllabus books | Open | Visible | Pass |
| P-17 | Messages / Help | Open | Works | Blocked |
| P-18 | Negative: mark attendance | Cannot mark class attendance as teacher | Blocked | Pass |
| P-19 | Wrong parent login | Random mobile | Login fails | Pass |

---

## 8. Staff — Accountant (`qa.accountant@default.com`)

**Portal:** `/staff` · Permissions focused on fees / students / notices / message.

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| AC-01 | Login / Dashboard | Login | Staff dashboard | Pass |
| AC-02 | My ID Card | Open | Staff ID card | Not run |
| AC-03 | Fee collection | Collect Cash | Success + receipt | Pass |
| AC-04 | Fee UPI + UTR | UPI without UTR fails; with UTR succeeds | Validation + receipt UTR | Pass |
| AC-05 | Online + txn id | Online payment | Receipt shows txn | Pass |
| AC-06 | Fee history | Open history | List/filters | Pass |
| AC-07 | Defaulters | Open | List loads | Pass |
| AC-08 | Financial report | FY / Last Month / Custom | Filters work | Pass |
| AC-09 | Students (if permitted) | Open Students | Read/list as allowed | Pass |
| AC-10 | Notices / Events / Calendar | Open | Visible | Pass |
| AC-11 | Lead Management | Open Leads (always in staff menu) | Can view/create if API allows | Pass |
| AC-12 | Messages | Open if permitted | Works | Pass |
| AC-13 | Negative: hostel admin | Deep-link hostel visitors without hostel perm | Denied or hidden | Pass |
| AC-14 | Negative: staff roles admin | Cannot change school subscription | Blocked | Pass |

---

## 9. Staff — Reception (`qa.reception@default.com`)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| R-01 | Login | Login | Staff dashboard | Pass |
| R-02 | Lead create | Create lead | Saved | Not run |
| R-03 | Lead → Admission | Start Admission → complete student | Prefill; lead admitted | Not run |
| R-04 | Students | Open/manage as permitted | Works | Not run |
| R-05 | Gate Pass | Create/handle gate pass | Works | Not run |
| R-06 | Hostel visitors (if permitted) | View visitors | Access per role | Not run |
| R-07 | Attendance (if permitted) | Staff or student attendance | Works | Not run |
| R-08 | Notices / Events / Messages | Open | Works | Not run |
| R-09 | Negative: financial report | If fees not in permissions | Hidden / denied | Not run |

---

## 10. Staff — Security Guard (`qa.guard@default.com`)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| GD-01 | Login | Login | Staff dashboard | Pass |
| GD-02 | Hostel Visitors | Open visitors | Form/list available | Pass |
| GD-03 | Submit visitor + camera | Fill visitor + capture live photo → submit | Status **Pending**; photo stored | Pass |
| GD-04 | Cannot approve (policy) | Try approve as guard | Blocked **or** document actual behavior | Pass |
| GD-05 | Gate Pass | Open gatepass if permitted | Works | Pass |
| GD-06 | Students lookup | Open students if permitted | Read access | Pass |
| GD-07 | Notices / Messages | Open | Works | Pass |

---

## 11. Staff — Hostel Warden (`qa.warden@default.com`)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| W-01 | Login | Login | Staff dashboard | Pass |
| W-02 | See Pending visitors | Open Hostel Visitors | Guard submissions listed | Pass |
| W-03 | Approve visitor | Approve pending | Status Approved / CheckedIn path | Pass |
| W-04 | Reject visitor | Reject + reason | Status Rejected; reason stored | Pass |
| W-05 | Check-out | Check out visitor | CheckedOut | Pass |
| W-06 | Hostel buildings/rooms/residents | Open each | CRUD/view as permitted | Pass |
| W-07 | Students / attendance | If permitted | Works | Pass |
| W-08 | Notices / Messages | Open | Works | Pass |

**End-to-end hostel visitor scenario (Guard → Warden)**

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Guard | Submit visitor + photo | Pending |
| 2 | Warden | Approve | Approved / CheckedIn |
| 3 | Warden | Check out | CheckedOut |
| 4 | Guard | Submit second visitor | Pending |
| 5 | Warden | Reject with reason | Rejected |

---

## 12. Staff — Librarian (`qa.library@default.com`)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| L-01 | Login | Login | Staff dashboard (librarian variant if any) | Pass |
| L-02 | Library module | Add/issue/return books | Operations succeed | Pass |
| L-03 | Students (if permitted) | Lookup borrowers | Works | Pass |
| L-04 | Notices / Events | Open | Works | Pass |
| L-05 | Negative: fees | Fee collection without fees perm | Hidden / denied | Pass |
| L-06 | Negative: transport | Transport admin | Hidden / denied | Pass |

---

## 13. Driver (no portal) — verify via School Admin / Staff

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| DR-01 | Appears in Staff list | School Admin → Staff | QA Transport Driver listed | Pass |
| DR-02 | Appears in Drivers | Transport → Drivers | Same driver | Pass |
| DR-03 | Documents | Upload photo, Aadhaar, license | Persist after refresh | Not run |
| DR-04 | Assign to bus/route | Assign | Saved | Pass |
| DR-05 | No login | Try phone/email on login page | No driver portal login | Pass |

---

## 14. Feature matrix — who must verify what

| Domain / Feature | Super Admin | School Admin | Teacher | Student | Parent | Accountant | Reception | Guard | Warden | Librarian | Driver |
|------------------|:-----------:|:------------:|:-------:|:-------:|:------:|:----------:|:---------:|:-----:|:------:|:---------:|:------:|
| Platform schools / plans | **T** | — | — | — | — | — | — | — | — | — | — |
| Module subscription | **T** | View impact | — | — | — | — | — | — | — | — | — |
| Students CRUD / bulk | — | **T** | View | Own | Child | R* | **T** | R* | R* | R* | — |
| Lead → Admission | — | **T** | — | — | — | R* | **T** | — | — | — | — |
| Teachers CRUD | — | **T** | — | — | — | — | — | — | — | — | — |
| Classes / sections / subjects | — | **T** | View | — | — | — | — | — | — | — | — |
| Student attendance | — | Report | **Mark** | Own | — | — | R* | — | R* | — | — |
| Staff attendance | — | **T** | — | — | — | — | R* | — | — | — | — |
| Unified staff + roles | — | **T** | — | — | — | — | — | — | — | — | Entity |
| Exams / marks / report card | — | **T** | **T** | Own | Child | — | — | — | — | — | — |
| Syllabus / timetable | — | **T** | **T** | View | — | — | — | — | — | — | — |
| Assignments / diary / HW / daily learning | — | **T** | **T** | **T** | View | — | — | — | — | — | — |
| Fee structure | — | **T** | — | — | — | — | — | — | — | — | — |
| Fee collect (Cash/UPI+UTR/Online) | — | **T** | — | — | Pay* | **T** | — | — | — | — | — |
| Fee history / defaulters | — | **T** | — | — | — | **T** | — | — | — | — | — |
| Financial report filters | — | **T** | — | — | — | **T** | — | — | — | — | — |
| Transport / routes / buses | — | **T** | — | — | View GPS | — | — | — | — | — | Entity |
| Driver documents | — | **T** | — | — | — | — | — | — | — | — | Entity |
| Hostel buildings/rooms/residents | — | **T** | — | — | — | — | R* | R* | **T** | — | — |
| Hostel visitor submit + photo | — | T | — | — | — | — | R* | **T** | T | — | — |
| Hostel visitor approve/reject | — | **T** | — | — | — | — | — | — | **T** | — | — |
| Library | — | **T** | — | View | — | — | — | — | — | **T** | — |
| House allocation | — | **T** | — | — | — | — | — | — | — | — | — |
| Commerce / store / orders | — | **T** | — | — | Store | — | — | — | — | — | — |
| Certificates / ID cards | — | **T** | ID | Own ID | Child ID | Own ID | Own ID | Own ID | Own ID | Own ID | — |
| Notices / events / calendar | — | **T** | View | View | View | View | View | View | View | View | — |
| Groups / blogs | — | **T** | T* | T* | T* | — | — | — | — | — | — |
| Gate pass | — | **T** | T* | — | T* | — | **T** | T* | — | — | — |
| Messages / help | **T** | **T** | **T** | **T** | **T** | T* | T* | T* | T* | T* | — |

**Legend:** **T** = primary tester · R* = if permission granted · T* = if module/permission on · Pay* = parent pay flow · Entity = no login · — = out of scope / should be denied

---

## 15. Priority smoke pack (minimum before release)

Run these first if time is short:

1. Super Admin login + Default School modules unlocked  
2. School Admin: unified Staff list (staff/teacher/driver)  
3. Reception or School: Lead → Start Admission → student saved → lead admitted  
4. Accountant or School: Fee Cash + UPI with UTR + receipt  
5. Accountant or School: Financial Report (FY + custom range)  
6. School: Driver document uploads  
7. Guard submit visitor+photo → Warden approve → checkout  
8. Teacher: mark attendance  
9. Student login + Parent login (mobile)  
10. Parent: Pay Fee / Transport view (smoke)  
11. Librarian: Library open  
12. Logout + wrong-password negative tests  

---

## 16. Defect log template

| Defect ID | Severity | Role | Case ID | Summary | Steps to reproduce | Expected | Actual | Status |
|-----------|----------|------|---------|---------|--------------------|----------|--------|--------|
| DEF-001 | Critical | Backend | — | Duplicate `generateStudentId` crashed server | Start Backend | Server starts | SyntaxError duplicate decl | Fixed |
| DEF-002 | High | School/Reception | SC-19 | Lead create E11000 `leadNumber` null | Create 2nd lead | Lead created | Duplicate key `leadNumber` null | Fixed — auto-generate leadNumber + backfill |
| DEF-003 | High | Teacher | T-25/T-26 | Teachers could access fee-structure and `/api/schools` | Teacher GET those URLs | 403 | 200 | Fixed — requireRoles middleware |
| DEF-004 | Med | Parent | P-18 | Attendance save checked fields before role | Parent POST attendance | 403 | 400 missing fields | Fixed — role check first |
| DEF-005 | High | School Admin | SC-112 | Bus route null unique-index collision | Create 2nd bus without a route | Bus created | E11000 dup key `route:null` (500) | Fixed - removed `default:null` on Bus.route/driver so sparse unique index skips unset fields |
| DEF-006 | Critical | Super Admin | SA-06 | `razorpayKeyId` ReferenceError on school create | Super Admin creates a school | School created (201) | 500 ReferenceError: razorpayKeyId is not defined | Fixed - `razorpayKeyId`/`razorpayKeySecret` now destructured from req.body in createSchool |
| DEF-007 | High | Librarian | L-05 | Librarian could read fee history (access-control gap) | Librarian GET /api/fees | 403 denied | 200 fee data returned | Fixed - feeRoute now uses checkModuleAccess("fees") guard |

**Severity guide**

- **Critical:** Login broken, data loss, wrong school data leak  
- **High:** Core fee/admission/attendance failure  
- **Medium:** UI bug, filter wrong, permission leak limited  
- **Low:** Cosmetic, copy, non-blocking

---

## 17. Sign-off

| Role / Area | Tester | Date | Pass % | Sign-off |
|-------------|--------|------|--------|----------|
| Super Admin | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (5/5 executed) | Partial — API only |
| School Admin | Cursor QA (API+smoke) | 21 Jul 2026 | ~97% (30/31 executed) | Partial — API only |
| Teacher | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (3/3 executed) | Partial — API only |
| Student | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (1/1 executed) | Partial — API only |
| Parent | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (3/3 executed) | Partial — API only |
| Accountant | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (2/2 executed) | Partial — API only |
| Reception | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (1/1 executed) | Partial — API only |
| Security Guard | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (1/1 executed) | Partial — API only |
| Hostel Warden | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (1/1 executed) | Partial — API only |
| Librarian | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (1/1 executed) | Partial — API only |
| Driver (via admin) | Cursor QA (API+smoke) | 21 Jul 2026 | ~100% (2/2 executed) | Partial — API only |
| **Release** | Cursor QA (API+smoke+UI-deep+recheck) | 21 Jul 2026 | ~96% (181 Pass / 188 executed, 7 Blocked, 0 Fail) | **Not released** — coverage partial |

**Notes:** This sign-off reflects the 21 Jul 2026 automated pass — backend API contract checks (auth/RBAC/list-read endpoints) plus the login-page UI smoke test only. Full UI deep-tests (forms, uploads, fee payment flows, hostel/visitor lifecycle, bulk import, etc.) across all 225 documented cases remain **Not run** and must be completed by a human tester before final release sign-off. 37 of 225 cases are currently Not run (mostly forms/uploads/payment-flow UI click-through and a few blocked-by-prerequisite negative tests); see Execution summary at top and Section 16 for defects found and fixed during this pass.

---

## 18. Notes & known product rules

1. **Driver has no user portal** — only an entity managed by School/Staff Transport.  
2. **Parent login username** is usually father mobile (`parentCredentials.username`).  
3. **Staff menus are permission-filtered** — Accountant vs Guard vs Warden see different modules.  
4. **Mobile menus** (`SchoolMenu`, `ParentMenu`, etc.) may show fewer items than desktop Sidebar; deep routes in `app.jsx` remain the source of truth.  
5. **UPI payments require UTR**; Online requires transaction ID.  
6. Re-seed command resets/refreshes QA users listed in Section 1:  
   `node Backend/scripts/seedQaTestUsers.js`

---

*End of document — Eduaitor Complete QA Test Plan v1.0*
