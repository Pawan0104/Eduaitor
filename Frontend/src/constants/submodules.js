/**
 * Canonical sub-module registry.
 *
 * Every permission-controlled screen in the ERP has one stable id here.
 * `module` is the parent key from constants/module.js (null for cross-module
 * utilities). `routes` are frontend paths and `api` are backend path prefixes
 * used to enforce access on direct navigation and direct API calls.
 *
 * Keep this file in sync with Frontend/src/constants/submodules.js.
 */
export const SUB_MODULES = [
  // ── General utilities ──────────────────────────────────────────────────
  { id: "home.hub", label: "Home / Menu Hub", module: null, routes: ["/menu", "/dashboard", "/school/menu", "/school/dashboard", "/teacher/menu", "/teacher/dashboard", "/staff/menu", "/staff/dashboard", "/parent/menu", "/parent/dashboard", "/student/menu", "/student/dashboard"], api: [] },
  { id: "notifications.alerts", label: "Notifications", module: null, routes: ["/school/notification", "/teacher/notification", "/staff/notification", "/parent/notification", "/student/notification"], api: ["/notifications/*"] },
  { id: "notifications.smart", label: "Smart Notifications", module: "notices", routes: ["/school/smart-notifications", "/staff/smart-notifications"], api: ["/smart-notifications/*"] },
  { id: "helpSupport.general", label: "Help / Support", module: null, routes: ["/school/help", "/teacher/help", "/staff/help", "/parent/help", "/student/help"], api: [] },
  { id: "helpSupport.requests", label: "Help Requests", module: "message", routes: ["/messages", "/messages/:threadId"], api: ["/message-signal/*"] },
  { id: "messages.inbox", label: "Messages", module: "message", routes: ["/school/messages", "/teacher/messages", "/staff/messages", "/parent/messages", "/student/messages"], api: ["/messages/*"] },
  { id: "messages.new", label: "New Message", module: "message", routes: ["/school/messages/new", "/teacher/messages/new", "/staff/messages/new", "/parent/messages/new", "/student/messages/new"], api: ["/messages/*"] },
  { id: "messages.thread", label: "Message Thread", module: "message", routes: ["/school/messages/:threadId", "/teacher/messages/:threadId", "/staff/messages/:threadId", "/parent/messages/:threadId", "/student/messages/:threadId"], api: ["/messages/*"] },

  // ── Students ───────────────────────────────────────────────────────────
  { id: "students.all", label: "All Students", module: "students", routes: ["/school/students", "/teacher/students", "/staff/students"], api: ["/students/*"] },
  { id: "students.add", label: "Add Student", module: "students", routes: ["/school/student-manage", "/school/student-manage/:id", "/staff/student-manage", "/staff/student-manage/:id"], api: ["/students/*"] },
  { id: "students.bulkUpload", label: "Bulk Upload", module: "students", routes: ["/school/students/bulk-upload"], api: ["/students/bulk*"] },
  { id: "students.documents", label: "Student Documents", module: "documents", routes: ["/school/documents", "/staff/documents"], api: ["/students/documents/*"] },
  { id: "students.certificates", label: "Certificates", module: "certificates", routes: ["/school/certificates"], api: ["/certificates/*"] },
  { id: "students.documentDesigns", label: "Document Designs", module: "certificates", routes: ["/school/certificates/settings"], api: ["/certificates/settings/*"] },
  { id: "students.admissionForm", label: "Admission Form", module: "students", routes: ["/school/admission-form", "/staff/admission-form"], api: ["/admission-form/*"] },
  { id: "students.profileView", label: "Student Profile", module: "students", routes: ["/school/student-view/:id", "/teacher/student-view/:id", "/staff/student-view/:id", "/parent/student"], api: ["/students/*"] },
  { id: "students.credentials", label: "Student Credentials", module: "students", routes: ["/parent/credentials"], api: ["/students/*"] },
  { id: "students.academicSessions", label: "Academic Sessions", module: "students", routes: ["/school/academic-sessions", "/staff/academic-sessions"], api: ["/academic-years/*", "/terms/*"] },

  // ── Teachers ───────────────────────────────────────────────────────────
  { id: "teachers.all", label: "All Teachers", module: "teachers", routes: ["/school/teachers", "/staff/teachers"], api: ["/teachers/*"] },
  { id: "teachers.substitution", label: "Teacher Substitution", module: "teachers", routes: ["/school/proxy-teacher"], api: ["/teachers/substitute/*"] },
  { id: "teachers.manage", label: "Teacher Management", module: "teachers", routes: ["/school/teacher-manage", "/school/teacher-manage/:id", "/school/teacher-view/:id", "/staff/teacher-manage", "/staff/teacher-manage/:id", "/staff/teacher-view/:id"], api: ["/teachers/*"] },
  { id: "teachers.assignment", label: "Teachers Assignment", module: "teachers", routes: ["/school/teachers-assignment", "/teacher/teachers-assignment"], api: ["/teachers/assignments/*"] },

  // ── Classes & subjects ─────────────────────────────────────────────────
  { id: "classes.myClasses", label: "My Classes", module: "classes", routes: ["/teacher/class"], api: ["/classes/teacher/my-classes"] },
  { id: "classes.subjects", label: "Classes & Subjects", module: "classes", routes: ["/school/classes-subjects", "/teacher/classes-subjects"], api: ["/classes/*", "/subjects/*"] },
  { id: "classes.sectionStream", label: "Sections & Streams", module: "classes", routes: ["/school/section", "/school/streams"], api: ["/sections/*", "/streams/*"] },
  { id: "classes.subjectMaster", label: "Subject Master", module: "classes", routes: ["/school/subject", "/school/subjects-master"], api: ["/subjects/*"] },
  { id: "classes.compulsoryOptional", label: "Compulsory & Optional Subjects", module: "classes", routes: ["/school/compulsory-subjects", "/school/optional-groups", "/teacher/compulsory-subjects", "/teacher/optional-groups"], api: ["/subjects/*"] },
  { id: "classes.assignmentFlow", label: "Class Assignment & Flow", module: "classes", routes: ["/school/class", "/teacher/class", "/school/class-view/:id", "/teacher/class-view/:id", "/school/flow-simulator", "/teacher/flow-simulator"], api: ["/classes/*"] },

  // ── Attendance & leave ─────────────────────────────────────────────────
  { id: "attendance.principalReport", label: "Attendance Report", module: "attendance", routes: ["/school/attendance"], api: ["/class-attendance/*"] },
  { id: "attendance.studentDetail", label: "Student Attendance Detail", module: "attendance", routes: ["/school/attendance/student/:studentId", "/teacher/attendance/student/:studentId"], api: ["/class-attendance/*", "/attendance/*"] },
  { id: "attendance.markClass", label: "Mark Class Attendance", module: "attendance", routes: ["/teacher/attendance/mark"], api: ["/class-attendance/*"] },
  { id: "attendance.teacherReport", label: "Teacher Attendance Report", module: "attendance", routes: ["/teacher/attendance/report"], api: ["/class-attendance/*"] },
  { id: "attendance.markMy", label: "Mark My Attendance", module: "attendance", routes: ["/teacher/attendance/my"], api: ["/attendance/*"] },
  { id: "attendance.studentLeave", label: "Student Leave Requests", module: "leaveRequest", routes: ["/school/leave-request", "/teacher/leave-request", "/staff/leave-request", "/parent/leave-request"], api: ["/leave-request/*"] },
  { id: "attendance.myLeave", label: "My Leave", module: "staffLeave", routes: ["/school/my-leave", "/teacher/my-leave", "/staff/my-leave"], api: ["/staff-leave/*"] },
  { id: "attendance.staffLeaveAdmin", label: "Staff Leave Administration", module: "staffLeave", routes: ["/school/staff-leave", "/staff/staff-leave"], api: ["/staff-leave/*"] },
  { id: "attendance.staffSelf", label: "Mark My Attendance", module: "attendance", routes: ["/staff/attendance"], api: ["/staff-attendance/*"] },
  { id: "attendance.staffManage", label: "Staff Attendance", module: "attendance", routes: ["/staff/attendance/manage", "/school/staff-attendance"], api: ["/staff-attendance/*"] },
  { id: "attendance.studentView", label: "My Attendance", module: "attendance", routes: ["/student/attendance"], api: ["/attendance/*"] },
  { id: "attendance.parentView", label: "Child Attendance", module: "attendance", routes: ["/parent/attendance"], api: ["/attendance/*"] },

  // ── Reports ────────────────────────────────────────────────────────────
  { id: "reports.hub", label: "Reports Hub", module: null, routes: ["/school/reports", "/staff/reports"], api: [] },

  // ── Exams ──────────────────────────────────────────────────────────────
  { id: "exams.scheduler", label: "Smart Exam Scheduler", module: "exams", routes: ["/school/exam-scheduler"], api: ["/exam-schedule/*"] },
  { id: "exams.schedule", label: "Schedule Exams", module: "exams", routes: ["/staff/exams"], api: ["/exam/*"] },
  { id: "exams.classTest", label: "Class Tests", module: "exams", routes: ["/school/class-test", "/teacher/class-test"], api: ["/classtest/*"] },
  { id: "exams.papers", label: "Exam Papers", module: "exams", routes: ["/school/exam-papers", "/teacher/exam-papers"], api: ["/exam-papers/*", "/question-bank/*"] },
  { id: "exams.marksEntry", label: "Marks Entry", module: "exams", routes: ["/school/exam-marks-entry", "/teacher/exam", "/staff/exam-marks"], api: ["/exam/*"] },
  { id: "exams.marks", label: "Exam Marks", module: "exams", routes: ["/school/exam-marks"], api: ["/exam/*"] },
  { id: "exams.results", label: "Exam Results", module: "exams", routes: ["/parent/exam-result", "/student/exam-result"], api: ["/exam/*"] },
  { id: "exams.reportCard", label: "Report Card", module: "exams", routes: ["/school/report-card", "/staff/report-card", "/teacher/report-card", "/parent/report-card", "/student/report-card"], api: ["/exam/*"] },

  // ── Syllabus & timetable ───────────────────────────────────────────────
  { id: "syllabus.manage", label: "Syllabus", module: "syllabus", routes: ["/school/syllabus", "/teacher/syllabus", "/staff/syllabus"], api: ["/syllabus/*"] },
  { id: "syllabus.books", label: "Syllabus Books", module: "syllabus", routes: ["/parent/syllabus-books", "/student/syllabus-books"], api: ["/syllabus/*"] },
  { id: "syllabus.catalog", label: "Syllabus Catalog", module: "syllabus", routes: ["/syllabus-catalog"], api: ["/syllabus-catalog/*"] },
  { id: "timetable.view", label: "Timetable", module: "timetable", routes: ["/school/timetable", "/teacher/timetable", "/staff/timetable", "/student/timetable"], api: ["/timetable/*"] },

  // ── Fees ───────────────────────────────────────────────────────────────
  { id: "fees.structure", label: "Fee Structure", module: "fees", routes: ["/school/fee-structure"], api: ["/fee-structure/*"] },
  { id: "fees.collection", label: "Fee Collection", module: "fees", routes: ["/school/fee-collection", "/staff/fees", "/parent/fees"], api: ["/fee-collect/*", "/fees/*"] },
  { id: "fees.receipt", label: "Fee Receipt", module: "fees", routes: ["/school/fees/receipt/:paymentId", "/staff/fees/receipt/:paymentId", "/parent/fees/receipt/:paymentId"], api: ["/fee-collect/*"] },
  { id: "fees.history", label: "Fee History", module: "fees", routes: ["/school/fee-history", "/staff/fee-history"], api: ["/fee-history/*"] },
  { id: "fees.financialReport", label: "Financial Report", module: "fees", routes: ["/school/financial-report", "/staff/financial-report"], api: ["/fee-history/*", "/fees/*"] },
  { id: "fees.defaulters", label: "Fee Defaulters", module: "fees", routes: ["/school/defaulters", "/staff/defaulters"], api: ["/fees/*"] },

  // ── Communication ──────────────────────────────────────────────────────
  { id: "groups.group", label: "Groups", module: "groups", routes: ["/school/group", "/teacher/group", "/staff/group", "/student/group"], api: ["/groups/*"] },
  { id: "diary.view", label: "Diary", module: "diary", routes: ["/school/diary", "/teacher/diary", "/staff/diary", "/student/diary"], api: ["/diary/*"] },
  { id: "notices.list", label: "Notices", module: "notices", routes: ["/school/notice", "/teacher/notice", "/staff/notice", "/parent/notice", "/student/notice"], api: ["/notices/*"] },
  { id: "events.list", label: "Events", module: "events", routes: ["/school/event", "/school/event/:id", "/teacher/event", "/teacher/event/:id", "/staff/event", "/staff/event/:id", "/parent/event", "/parent/event/:id", "/student/event", "/student/event/:id"], api: ["/events/*"] },
  { id: "events.calendar", label: "Calendar", module: "events", routes: ["/school/calendar", "/teacher/calendar", "/staff/calendar", "/parent/calendar", "/student/calendar"], api: ["/calendar/*"] },

  // ── Transport ──────────────────────────────────────────────────────────
  { id: "transport.overview", label: "Transport", module: "transport", routes: ["/school/transport", "/staff/transport", "/parent/transport"], api: ["/transport/*"] },
  { id: "transport.routes", label: "Route Manage", module: "transport", routes: ["/school/transport-route", "/staff/transport-route"], api: ["/transport/route/*"] },
  { id: "transport.buses", label: "Bus Manage", module: "transport", routes: ["/school/transport-bus", "/staff/transport-bus"], api: ["/transport/bus/*"] },
  { id: "transport.drivers", label: "Driver Manage", module: "transport", routes: ["/school/transport-driver", "/staff/transport-driver"], api: ["/transport/driver/*"] },
  { id: "transport.stops", label: "Stop Manage", module: "transport", routes: ["/school/transport-stop", "/staff/transport-stop"], api: ["/transport/stop/*"] },
  { id: "transport.attendants", label: "Attendant Manage", module: "transport", routes: ["/school/transport-attendant", "/staff/transport-attendant"], api: ["/transport/attendant/*"] },
  { id: "transport.vendors", label: "Vendor Manage", module: "transport", routes: ["/school/transport-vendor", "/staff/transport-vendor"], api: ["/transport/vendor/*"] },
  { id: "transport.gps", label: "GPS Tracking", module: "gpsTracking", routes: ["/school/transport-gps"], api: ["/transport/gps/*"] },

  // ── Library, hostel, commerce, blogs, marketing, house ─────────────────
  { id: "library.manage", label: "Library", module: "library", routes: ["/school/library", "/staff/library", "/student/library"], api: ["/library/*"] },
  { id: "hostel.manage", label: "Hostel Management", module: "hostel", routes: ["/school/hostel", "/staff/hostel"], api: ["/hostel/*"] },
  { id: "hostel.buildings", label: "Hostel Buildings", module: "hostel", routes: ["/school/hostel/buildings", "/staff/hostel/buildings"], api: ["/hostel/buildings/*"] },
  { id: "hostel.rooms", label: "Hostel Rooms", module: "hostel", routes: ["/school/hostel/rooms", "/staff/hostel/rooms"], api: ["/hostel/rooms/*"] },
  { id: "hostel.residents", label: "Hostel Residents", module: "hostel", routes: ["/school/hostel/residents", "/staff/hostel/residents"], api: ["/hostel/residents/*"] },
  { id: "hostel.visitors", label: "Hostel Visitors", module: "hostel", routes: ["/school/hostel/visitors", "/staff/hostel/visitors"], api: ["/hostel/visitors/*"] },
  { id: "hostel.parentVisit", label: "Hostel Visit", module: "hostel", routes: ["/parent/hostel-visit"], api: ["/hostel/visitors/*"] },
  { id: "commerce.suite", label: "School Commerce Suite", module: "commerce", routes: ["/school/commerce"], api: ["/commerce/*"] },
  { id: "commerce.store", label: "School Store", module: "commerce", routes: ["/parent/store", "/school/commerce/store"], api: ["/commerce/*"] },
  { id: "commerce.ordersInventory", label: "Orders & Inventory", module: "commerce", routes: ["/school/commerce/orders", "/school/commerce/:section"], api: ["/commerce/*"] },
  { id: "blogs.feed", label: "Blogs", module: "blogs", routes: ["/school/blogs", "/teacher/blogs", "/parent/blogs", "/student/blogs"], api: ["/blogs/*"] },
  { id: "marketing.dashboard", label: "Marketing AI", module: "marketing", routes: ["/marketing", "/school/marketing", "/teacher/marketing", "/staff/marketing"], api: ["/marketing/*"] },
  { id: "marketing.accounts", label: "Marketing Accounts", module: "marketing", routes: ["/marketing/accounts", "/school/marketing/accounts", "/teacher/marketing/accounts", "/staff/marketing/accounts"], api: ["/marketing/accounts/*", "/marketing/oauth/*"] },
  { id: "marketing.workflow", label: "Marketing Workflow", module: "marketing", routes: ["/school/marketing/suggestions", "/school/marketing/create", "/school/marketing/approvals", "/teacher/marketing/suggestions", "/teacher/marketing/create", "/teacher/marketing/approvals", "/staff/marketing/suggestions", "/staff/marketing/create", "/staff/marketing/approvals", "/school/marketing/oauth/callback", "/teacher/marketing/oauth/callback", "/staff/marketing/oauth/callback"], api: ["/marketing/*"] },
  { id: "house.allocation", label: "House Allocation", module: "house", routes: ["/school/house", "/staff/house"], api: ["/house/*"] },

  // ── Staff, roles & access control ──────────────────────────────────────
  { id: "staff.management", label: "Staff Management", module: "staff", routes: ["/school/staff", "/staff/staff"], api: ["/staff/*"] },
  { id: "staff.roles", label: "Staff Roles", module: "staff", routes: ["/school/staff-roles", "/staff/staff-roles"], api: ["/school-staff-roles/*"] },
  { id: "staff.andTeachers", label: "Staff & Teachers", module: "staff", routes: ["/school/staff-and-teachers"], api: ["/staff/*", "/teachers/*"] },
  { id: "staff.leaveTypes", label: "Staff Leave Types", module: "staffLeave", routes: ["/leave-types"], api: ["/staff-leave/types/*"] },
  { id: "accessControl.platform", label: "Platform Access Control", module: null, routes: ["/access-control"], api: ["/access/*", "/roles/*"] },
  { id: "accessControl.school", label: "School Access Control", module: null, routes: ["/school/access-control"], api: ["/school-staff-roles/*"] },
  { id: "accessControl.schools", label: "Schools & Subscriptions", module: null, routes: ["/schools", "/add-school", "/school-view/:id", "/subscription-plan"], api: ["/schools/*", "/subscriptions/*"] },
  { id: "accessControl.analytics", label: "Platform Analytics", module: null, routes: ["/platform-analytics"], api: [] },

  // ── Gate pass ──────────────────────────────────────────────────────────
  { id: "gatepass.view", label: "Gate Pass", module: "gatepass", routes: ["/school/gatepass", "/teacher/gatepass", "/staff/gatepass", "/parent/gatepass"], api: ["/gatepass/*"] },

  // ── Assignments ────────────────────────────────────────────────────────
  { id: "assignments.create", label: "Create Assignment", module: "assignments", routes: ["/teacher/assignment"], api: ["/assignment/*"] },
  { id: "assignments.teacherResult", label: "Assignment Result", module: "assignments", routes: ["/teacher/assignment/result"], api: ["/assignment/*"] },
  { id: "assignments.studentList", label: "My Assignments", module: "assignments", routes: ["/student/assignment", "/parent/assignment"], api: ["/assignment/*"] },
  { id: "assignments.studentResult", label: "Assignment Result", module: "assignments", routes: ["/student/assignment/result", "/parent/assignment/result"], api: ["/assignment/*"] },
  { id: "assignments.pagesTaught", label: "Pages Taught", module: "assignments", routes: ["/teacher/page-progress"], api: ["/learning-progress/*"] },
  { id: "assignments.staff", label: "Assignments", module: "assignments", routes: ["/staff/assignments"], api: ["/assignment/*"] },

  // ── Leads, registration & ID cards ────────────────────────────────────
  { id: "leads.manage", label: "Lead Management", module: "leads", routes: ["/school/leads", "/staff/leads"], api: ["/leads/*"] },
  { id: "leads.registration", label: "Registration", module: "leads", routes: ["/school/registrations", "/staff/registrations", "/register/:token"], api: ["/registrations/*", "/public/*"] },
  { id: "leads.admissionReports", label: "Admission Reports", module: "leads", routes: ["/school/admission-reports", "/staff/admission-reports"], api: ["/admission-reports/*"] },
  { id: "idCards.student", label: "Student ID Card", module: "documents", routes: ["/student/id-card", "/parent/id-card", "/staff/id-card", "/school/id-card/student/:id", "/teacher/id-card/student/:id", "/staff/id-card/student/:id"], api: ["/id-card/*"] },
  { id: "idCards.staff", label: "Staff ID Card", module: "documents", routes: ["/school/id-card/staff/:id", "/staff/id-card/staff/:id"], api: ["/id-card/*"] },
];

export const SUBMODULE_IDS = SUB_MODULES.map((s) => s.id);

export const SUBMODULE_BY_ID = SUB_MODULES.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {});

export const SUBMODULES_BY_MODULE = SUB_MODULES.reduce((acc, s) => {
  const key = s.module || "__general__";
  if (!acc[key]) acc[key] = [];
  acc[key].push(s);
  return acc;
}, {});

/** All sub-modules that belong to a parent module key. */
export const getSubmoduleIdsForModule = (moduleKey) =>
  (SUBMODULES_BY_MODULE[moduleKey] || []).map((s) => s.id);

/** Segment-aware wildcard matcher: `:id` and `*` both match one segment. */
export const matchesPathPattern = (pattern, pathname) => {
  const clean = (value) => String(value || "").split("?")[0].replace(/\/+$/, "") || "/";
  const patternParts = clean(pattern).split("/").filter(Boolean);
  const pathParts = clean(pathname).split("/").filter(Boolean);

  // A trailing /* matches the base path itself and any number of child paths.
  const hasWildcardTail = patternParts[patternParts.length - 1] === "*";
  const comparableParts = hasWildcardTail
    ? patternParts.slice(0, -1)
    : patternParts;

  if (hasWildcardTail) {
    if (pathParts.length < comparableParts.length) return false;
  } else if (patternParts.length !== pathParts.length) {
    return false;
  }

  return comparableParts.every((part, index) => {
    if (part === "*" || part.startsWith(":")) return true;
    return part.toLowerCase() === (pathParts[index] || "").toLowerCase();
  });
};

/**
 * Find the most specific sub-module for a path. Patterns with fewer wildcards
 * win, so `/messages/new` is never mistaken for `/messages/:threadId`.
 */
export const findSubmoduleByPattern = (pathname, field = "routes") => {
  let best = null;
  let bestScore = -1;

  for (const submodule of SUB_MODULES) {
    for (const pattern of submodule[field] || []) {
      if (!matchesPathPattern(pattern, pathname)) continue;
      const wildcards = String(pattern)
        .split("/")
        .filter((part) => part === "*" || part.startsWith(":")).length;
      const score = String(pattern).length - wildcards * 10;
      if (score > bestScore) {
        best = submodule;
        bestScore = score;
      }
    }
  }

  return best;
};

export const findSubmoduleForRoute = (pathname) =>
  findSubmoduleByPattern(pathname, "routes");

export const findSubmoduleForApi = (pathname) =>
  findSubmoduleByPattern(pathname, "api");
