export const MODULES = [
  { key: "students",    label: "Student Management",  default: true  },
  { key: "teachers",   label: "Teacher Management",   default: true  },
  { key: "classes",    label: "Classes & Sections",   default: true  },
  { key: "attendance", label: "Attendance",            default: true  },
  { key: "exams",      label: "Exam Management",       default: false },
  { key: "fees",       label: "Fee Management",        default: false },
  { key: "timetable",  label: "Timetable",             default: false },
  { key: "syllabus",   label: "Syllabus",              default: false },
  { key: "transport",  label: "Transport",             default: false },
  { key: "library",    label: "Library",               default: false },
  { key: "diary",      label: "Diary",                 default: false },
  { key: "assignments",label: "Assignments",           default: false },
  { key: "events",     label: "Events & Calendar",     default: false },
  { key: "notices",    label: "Notices",               default: false },
  { key: "groups",     label: "Groups",                default: false },
  { key: "blogs",      label: "Blogs",                 default: false },
  { key: "staff",      label: "Staff",                 default: false },
  { key: "gatepass",   label: "Gate Passes",           default: false },
  { key: "message",   label: "Messages",           default: false },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);

export const DEFAULT_MODULES = MODULES.filter((m) => m.default).map((m) => m.key);