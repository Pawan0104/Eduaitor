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
| G-01 | Login page loads | Open `/admin/login` | Form shows; no console crash | |
| G-02 | Wrong password | Enter valid user + wrong password | Clear error; stay on login | |
| G-03 | Empty submit | Submit blank | Validation / error | |
| G-04 | Logout | Logout from any portal | Session cleared; redirect to login | |
| G-05 | Protected route | Open `/school/dashboard` while logged out | Redirect to login | |
| G-06 | Role isolation | Login as Teacher; open `/admin/dashboard` | Denied / redirect (not Super Admin) | |
| G-07 | First-time password | If `firstTimeLogin` true | Forced `/change-password` | |
| G-08 | Desktop vs mobile menu | Resize / open `*/menu` | Menu items load; deep links work | |
| G-09 | Notifications | Open Notifications | List loads (empty OK) | |
| G-10 | Help / Messages | Open Help or Messages | Thread UI loads | |
| G-11 | Calendar | Open Calendar | Calendar renders | |
| G-12 | Session expiry | Wait / clear cookie mid-use | Re-prompt login gracefully | |

---

## 3. Super Admin (`super@admin.com`)

**Portal:** `/admin` · Post-login: `/admin/dashboard` (desktop) or `/admin/menu` (mobile)

### 3.1 Access & platform

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SA-01 | Login | Login with Super Admin | Lands on admin dashboard | |
| SA-02 | Dashboard | Open Dashboard | Stats / overview load | |
| SA-03 | Access Control | Open Access Control | Page loads; permissions UI usable | |
| SA-04 | Role Management | Open Roles | List/create/edit platform roles | |
| SA-05 | All Schools | Open Schools | School list loads | |
| SA-06 | Add School | Add School → fill required → save | School created; appears in list | |
| SA-07 | School Management | Open School Management | Manage existing schools | |
| SA-08 | School Detail | Open a school detail / school-view | Detail shows modules, admin info | |
| SA-09 | Unlock modules | Ensure Default School has fees, hostel, transport, staff, etc. | Modules subscribed / active | |
| SA-10 | Subscription Plan | Open Subscription Plan | Plans list; create/edit plan | |
| SA-11 | Syllabus Catalog | Open Syllabus Catalog | Catalog CRUD works | |
| SA-12 | Help Requests | Open Messages / help threads | See school help requests; reply | |
| SA-13 | Platform analytics | Open `/admin/platform-analytics` (if exposed) | Page loads or intentional hide | |
| SA-14 | Logout | Logout | Back to login | |

---

## 4. School Admin (`school@admin.com`)

**Portal:** `/school` · Full ERP owner for one school.

### 4.1 Dashboard & common

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-01 | Login / Dashboard | Login | School dashboard loads | |
| SC-02 | Notifications | Open Notifications | Works | |
| SC-03 | Events | Create / edit / view event | Saved; visible in list & calendar | |
| SC-04 | Notices | Create / edit notice | Published; visible to roles | |
| SC-05 | Calendar | Open Calendar | Events show | |
| SC-06 | Gate Pass | Open Gate Pass | Create/list/approve as designed | |
| SC-07 | Messages | New message / open thread | Send/receive works | |
| SC-08 | Help / Support | Open Help | Can raise ticket to Super Admin | |

### 4.2 Students & admissions

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-10 | Student list | Open Students | List + search/filter | |
| SC-11 | Add student | Student Manage → fill mandatory → save | Student created with credentials | |
| SC-12 | Edit student | Edit existing → save | Updates persist | |
| SC-13 | Student view | Open student view | Profile/details correct | |
| SC-14 | Student ID card | Open ID card for student | Card renders / print | |
| SC-15 | Bulk upload | Bulk upload → valid CSV/file | Students imported; errors reported | |
| SC-16 | House allocation | Open House → assign student | Assignment saved | |
| SC-17 | Certificates | Issue / list certificates | Certificate generated | |
| SC-18 | Certificate settings | Certificate settings | Designs/templates save | |
| SC-19 | Lead create | Leads → add lead (name, phone, class interest) | Lead saved (active) | |
| SC-20 | Lead → Start Admission | Start Admission on lead | Opens `/student-manage?leadId=…` prefilled | |
| SC-21 | Lead → Admit | Complete student save from lead | Lead status **admitted**; student linked | |
| SC-22 | Lead pipeline | Move lead statuses (active → processing → …) | Status updates correctly | |

### 4.3 Teachers

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-30 | Teacher list | Open Teachers | List loads | |
| SC-31 | Add teacher | Teacher Manage → save | Teacher + login credentials | |
| SC-32 | Edit / view teacher | Edit & view | Data persists | |
| SC-33 | Teacher via Add Staff | Staff → Add → Teaching path | Creates teacher; appears in Staff + Teachers | |

### 4.4 Classes & academics structure

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-40 | Classes | Create class | Class saved | |
| SC-41 | Class view | Open class view | Students/subjects shown | |
| SC-42 | Sections | Create/edit section | Saved | |
| SC-43 | Subjects | Create/edit subject | Saved | |
| SC-44 | Syllabus | Assign/manage syllabus | Saved; visible to teacher/student as designed | |
| SC-45 | Timetable | Create/edit timetable | Saved; no overlap errors if validated | |

### 4.5 Attendance

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-50 | Student attendance report | Open Attendance | Report by date/class | |
| SC-51 | Student attendance detail | Open attendance/student/:id | History for student | |
| SC-52 | Staff attendance | Open Staff Attendance | Mark / view staff attendance | |

### 4.6 Staff & HR (unified)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-60 | Unified staff list | Open Staff Management | Shows **Staff + Teachers + Drivers** | |
| SC-61 | Add Non-teaching | Add Staff → Non-teaching (e.g. receptionist) | Staff created with login | |
| SC-62 | Add Transport Driver | Add Staff → Transport Driver | Driver created; in list | |
| SC-63 | Edit staff / teacher / driver | Edit each type | Correct form/route; saves | |
| SC-64 | Delete guards | Try delete staff with blockers | Blocked with clear message if dependencies | |
| SC-65 | Staff roles | Staff Roles → create role + permissions | Role saved; assignable | |
| SC-66 | Assign custom role | Assign role to staff | Permissions apply on next login | |
| SC-67 | Staff ID card | Open staff ID card | Renders | |
| SC-68 | Job titles | Create Security Guard / Hostel Warden | Job title saved; used in hostel flow | |

### 4.7 Exams

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-70 | Exam structure | Create exam structure | Saved | |
| SC-71 | Marks entry | Exam marks entry | Marks save | |
| SC-72 | Marks view | Exam marks / principal view | Results visible | |
| SC-73 | Report card | Generate/view report card | Correct marks layout | |

### 4.8 Fees & finance

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-80 | Fee structure | Create fee structure (class/year) | Saved | |
| SC-81 | Collect Cash | Fee Collection → Cash → save | Payment + receipt | |
| SC-82 | Collect UPI + UTR | Mode UPI **without** UTR | Validation error | |
| SC-83 | Collect UPI success | UPI + valid UTR → save | Payment saved; receipt shows UTR | |
| SC-84 | Collect Online | Online + transaction ID | Receipt shows txn id | |
| SC-85 | Cheque | Cheque mode if available | Saves with cheque details | |
| SC-86 | Fee history | Fee History | Payments listed; filters work | |
| SC-87 | Defaulters | Defaulters | Unpaid students listed | |
| SC-88 | Financial report FY | Financial Report → Financial Year | Data loads | |
| SC-89 | Financial report Last Month | Last Month filter | Correct period | |
| SC-90 | Financial report Custom | Custom from–to | Range applied | |
| SC-91 | Class drill-down | Click class in report | Detail breakdown | |
| SC-92 | Export/print | CSV / print if available | File/print works | |
| SC-93 | Receipt page | Open `/fees/receipt/:id` | Receipt printable | |

### 4.9 Diary / Homework / Groups

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-100 | Diary | Create/view diary entries | Saved | |
| SC-101 | Homework | Create/view homework | Saved | |
| SC-102 | Groups | Create group; add members | Group works | |

### 4.10 Transport & GPS

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-110 | Transport overview | Open Transport | Hub loads | |
| SC-111 | Routes | Create/edit route | Saved | |
| SC-112 | Buses | Create/edit bus | Saved | |
| SC-113 | Drivers list | Transport Drivers | QA driver visible | |
| SC-114 | Driver documents | Upload photo, Aadhaar, license (+ expiry) | Files persist on re-open | |
| SC-115 | Assign driver/bus/route | Link entities | Assignment saved | |
| SC-116 | GPS tracking | Open Transport GPS | Map/tracking UI (data may be empty) | |

### 4.11 Hostel

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-120 | Hostels | Create hostel | Saved | |
| SC-121 | Buildings | Create building | Saved | |
| SC-122 | Rooms | Create room (capacity) | Saved | |
| SC-123 | Residents | Allocate student to room | Allocation saved | |
| SC-124 | Visitors list | Open Hostel Visitors | List + filters | |
| SC-125 | Visitor approve (admin) | Approve pending visitor | Status updates; audit trail | |
| SC-126 | Visitor reject | Reject with reason | Status Rejected | |
| SC-127 | Check-out | Check out approved visitor | CheckedOut | |

### 4.12 Library / House / Commerce / Blogs

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| SC-130 | Library | Add book / issue / return (as UI allows) | Operations succeed | |
| SC-131 | Commerce suite | Open Commerce | Sections load | |
| SC-132 | Inventory | Open uniforms/books/stationery/accessories | CRUD items | |
| SC-133 | Store | Open school store view | Catalog shows | |
| SC-134 | Orders | Open orders | Order list / status | |
| SC-135 | Blogs | Create/publish blog | Visible publicly/in portals | |

---

## 5. Teacher (`teacher@admin.com`)

**Portal:** `/teacher`

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| T-01 | Login / Dashboard | Login | Teacher dashboard | |
| T-02 | Notifications | Open | Loads | |
| T-03 | Students | Open My Students | Class students listed | |
| T-04 | Student view | Open student | Details (read-oriented) | |
| T-05 | Student ID card | Open ID card | Renders | |
| T-06 | My Classes | Open Classes / class view | Assigned classes | |
| T-07 | Mark attendance | Attendance → Mark | Save attendance for date/class | |
| T-08 | Attendance report | Attendance report | History/report | |
| T-09 | Syllabus | Open Syllabus | View/update as allowed | |
| T-10 | Assignments | Create assignment | Saved; students can see | |
| T-11 | Assignment results | Results page | Submissions/marks | |
| T-12 | Exams / marks | Exam marks entry | Marks save | |
| T-13 | Report card | View report card | Loads | |
| T-14 | Timetable | Open Timetable | Shows teacher schedule | |
| T-15 | Diary | Create diary | Saved | |
| T-16 | Homework | Create homework | Saved | |
| T-17 | Daily learning / pages | Page progress / daily learning | Saves progress | |
| T-18 | Groups | Open Groups | Participate as designed | |
| T-19 | Notices | View notices | School notices visible | |
| T-20 | Events / Calendar | Open | Events visible | |
| T-21 | Blogs | Open if permitted | Loads | |
| T-22 | Gate Pass | Create/request gate pass | Works per policy | |
| T-23 | Messages | Send/receive | Works | |
| T-24 | Help | Open Help | Can contact support | |
| T-25 | Negative: fees admin | Try fee structure URL | No school-admin fee setup access | |
| T-26 | Negative: super admin | Open `/admin/*` | Blocked | |

---

## 6. Student (`qa.student@default.com`)

**Portal:** `/student` · No fees / transport / store / gatepass in student menu.

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| ST-01 | Login / Dashboard | Login | Student dashboard | |
| ST-02 | Notifications | Open | Loads | |
| ST-03 | Attendance | View own attendance | Own records only | |
| ST-04 | Timetable | Open | Class timetable | |
| ST-05 | Assignments | List + open | Assigned work visible | |
| ST-06 | Assignment result | Results | Own results | |
| ST-07 | Exam results | Exam result | Own results | |
| ST-08 | Report card | Open | Own report card | |
| ST-09 | ID card | My ID Card | Renders | |
| ST-10 | Diary | View diary | Class diary visible | |
| ST-11 | Homework | View / submit if UI allows | Works | |
| ST-12 | Daily learning | Open | Content/progress | |
| ST-13 | Syllabus books | Open | Books/syllabus list | |
| ST-14 | Library | Open | Student library view | |
| ST-15 | Groups | Open | Membership works | |
| ST-16 | Notices / Events / Calendar | Open each | Visible content | |
| ST-17 | Blogs | Open if module on | Loads | |
| ST-18 | Messages / Help | Open | Works | |
| ST-19 | Negative: fee pay | Open `/parent/fees` or school fee admin | Not available as student | |
| ST-20 | Change password | If prompted / settings | Password updates; re-login works | |

---

## 7. Parent (`9876543299` / `#qa@parent123`)

**Portal:** `/parent` · Same JWT role `student_admin` with `loginAs: parent`.

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| P-01 | Login / Dashboard | Login with mobile | Parent dashboard | |
| P-02 | My Child | Open My Child | Linked student profile | |
| P-03 | Notifications | Open | Loads | |
| P-04 | Pay Fee | Open Pay Fee | Outstanding / pay UI | |
| P-05 | Fee receipt | After payment / history | Receipt opens | |
| P-06 | School Store | Open Store | Catalog; place order if enabled | |
| P-07 | Transport & GPS | Open Transport | Route/bus/GPS for child | |
| P-08 | Exam results | Open | Child results | |
| P-09 | Report card | Open | Child report card | |
| P-10 | Student ID card | Open | Child ID card | |
| P-11 | Notices / Events / Calendar | Open | Visible | |
| P-12 | Blogs | Open if module on | Loads | |
| P-13 | Gate Pass | Request/view gate pass | Works per policy | |
| P-14 | Homework | View child’s homework | Visible | |
| P-15 | Learned today / Daily learning | Open | Visible | |
| P-16 | Syllabus books | Open | Visible | |
| P-17 | Messages / Help | Open | Works | |
| P-18 | Negative: mark attendance | Cannot mark class attendance as teacher | Blocked | |
| P-19 | Wrong parent login | Random mobile | Login fails | |

---

## 8. Staff — Accountant (`qa.accountant@default.com`)

**Portal:** `/staff` · Permissions focused on fees / students / notices / message.

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| AC-01 | Login / Dashboard | Login | Staff dashboard | |
| AC-02 | My ID Card | Open | Staff ID card | |
| AC-03 | Fee collection | Collect Cash | Success + receipt | |
| AC-04 | Fee UPI + UTR | UPI without UTR fails; with UTR succeeds | Validation + receipt UTR | |
| AC-05 | Online + txn id | Online payment | Receipt shows txn | |
| AC-06 | Fee history | Open history | List/filters | |
| AC-07 | Defaulters | Open | List loads | |
| AC-08 | Financial report | FY / Last Month / Custom | Filters work | |
| AC-09 | Students (if permitted) | Open Students | Read/list as allowed | |
| AC-10 | Notices / Events / Calendar | Open | Visible | |
| AC-11 | Lead Management | Open Leads (always in staff menu) | Can view/create if API allows | |
| AC-12 | Messages | Open if permitted | Works | |
| AC-13 | Negative: hostel admin | Deep-link hostel visitors without hostel perm | Denied or hidden | |
| AC-14 | Negative: staff roles admin | Cannot change school subscription | Blocked | |

---

## 9. Staff — Reception (`qa.reception@default.com`)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| R-01 | Login | Login | Staff dashboard | |
| R-02 | Lead create | Create lead | Saved | |
| R-03 | Lead → Admission | Start Admission → complete student | Prefill; lead admitted | |
| R-04 | Students | Open/manage as permitted | Works | |
| R-05 | Gate Pass | Create/handle gate pass | Works | |
| R-06 | Hostel visitors (if permitted) | View visitors | Access per role | |
| R-07 | Attendance (if permitted) | Staff or student attendance | Works | |
| R-08 | Notices / Events / Messages | Open | Works | |
| R-09 | Negative: financial report | If fees not in permissions | Hidden / denied | |

---

## 10. Staff — Security Guard (`qa.guard@default.com`)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| GD-01 | Login | Login | Staff dashboard | |
| GD-02 | Hostel Visitors | Open visitors | Form/list available | |
| GD-03 | Submit visitor + camera | Fill visitor + capture live photo → submit | Status **Pending**; photo stored | |
| GD-04 | Cannot approve (policy) | Try approve as guard | Blocked **or** document actual behavior | |
| GD-05 | Gate Pass | Open gatepass if permitted | Works | |
| GD-06 | Students lookup | Open students if permitted | Read access | |
| GD-07 | Notices / Messages | Open | Works | |

---

## 11. Staff — Hostel Warden (`qa.warden@default.com`)

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| W-01 | Login | Login | Staff dashboard | |
| W-02 | See Pending visitors | Open Hostel Visitors | Guard submissions listed | |
| W-03 | Approve visitor | Approve pending | Status Approved / CheckedIn path | |
| W-04 | Reject visitor | Reject + reason | Status Rejected; reason stored | |
| W-05 | Check-out | Check out visitor | CheckedOut | |
| W-06 | Hostel buildings/rooms/residents | Open each | CRUD/view as permitted | |
| W-07 | Students / attendance | If permitted | Works | |
| W-08 | Notices / Messages | Open | Works | |

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
| L-01 | Login | Login | Staff dashboard (librarian variant if any) | |
| L-02 | Library module | Add/issue/return books | Operations succeed | |
| L-03 | Students (if permitted) | Lookup borrowers | Works | |
| L-04 | Notices / Events | Open | Works | |
| L-05 | Negative: fees | Fee collection without fees perm | Hidden / denied | |
| L-06 | Negative: transport | Transport admin | Hidden / denied | |

---

## 13. Driver (no portal) — verify via School Admin / Staff

| ID | Feature | Steps | Expected | Result |
|----|---------|-------|----------|--------|
| DR-01 | Appears in Staff list | School Admin → Staff | QA Transport Driver listed | |
| DR-02 | Appears in Drivers | Transport → Drivers | Same driver | |
| DR-03 | Documents | Upload photo, Aadhaar, license | Persist after refresh | |
| DR-04 | Assign to bus/route | Assign | Saved | |
| DR-05 | No login | Try phone/email on login page | No driver portal login | |

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
| DEF-001 | High/Med/Low | | | | | | | Open |

**Severity guide**

- **Critical:** Login broken, data loss, wrong school data leak  
- **High:** Core fee/admission/attendance failure  
- **Medium:** UI bug, filter wrong, permission leak limited  
- **Low:** Cosmetic, copy, non-blocking

---

## 17. Sign-off

| Role / Area | Tester | Date | Pass % | Sign-off |
|-------------|--------|------|--------|----------|
| Super Admin | | | | |
| School Admin | | | | |
| Teacher | | | | |
| Student | | | | |
| Parent | | | | |
| Accountant | | | | |
| Reception | | | | |
| Security Guard | | | | |
| Hostel Warden | | | | |
| Librarian | | | | |
| Driver (via admin) | | | | |
| **Release** | | | | |

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
