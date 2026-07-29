/**
 * Shared menu icons for every role (student, parent, teacher, school, staff, admin).
 * Same emoji for the same module name everywhere.
 */
export const MENU_ICON_META = {
  Dashboard: { emoji: "🏠", accent: "#6366F1", short: "Home" },
  Notifications: { emoji: "🔔", accent: "#F59E0B", short: "Alerts" },
  Students: { emoji: "👨‍🎓", accent: "#3B82F6", short: "Students" },
  "My Child": { emoji: "👨‍👩‍👧", accent: "#6366F1", short: "My Child" },
  Teachers: { emoji: "👩‍🏫", accent: "#8B5CF6", short: "Teachers" },
  Staff: { emoji: "👥", accent: "#0EA5E9", short: "Staff" },
  Classes: { emoji: "🏫", accent: "#6366F1", short: "Classes" },
  "My Classes": { emoji: "🏫", accent: "#6366F1", short: "Classes" },
  Attendance: { emoji: "📅", accent: "#3B82F6", short: "Attendance" },
  Timetable: { emoji: "🗓️", accent: "#9333EA", short: "Timetable" },
  Assignment: { emoji: "📓", accent: "#10B981", short: "Class Work" },
  Assignments: { emoji: "📓", accent: "#10B981", short: "Assignments" },
  Exams: { emoji: "📝", accent: "#EF4444", short: "Exams" },
  "Exam Management": { emoji: "📝", accent: "#EF4444", short: "Exams" },
  "Exam Results": { emoji: "📖", accent: "#EF4444", short: "Results" },
  "Report Card": { emoji: "📋", accent: "#DC2626", short: "Report" },
  "My ID Card": { emoji: "🪪", accent: "#059669", short: "ID Card" },
  "Student ID Card": { emoji: "🪪", accent: "#059669", short: "ID Card" },
  Diary: { emoji: "📔", accent: "#C026D3", short: "Diary" },
  Homework: { emoji: "🎒", accent: "#F97316", short: "Home Work" },
  "Daily learning": { emoji: "✨", accent: "#4F46E5", short: "Learning" },
  "Learned today": { emoji: "📖", accent: "#4F46E5", short: "Today" },
  "Pages taught": { emoji: "📄", accent: "#6366F1", short: "Pages" },
  Syllabus: { emoji: "📚", accent: "#16A34A", short: "Syllabus" },
  "Syllabus Books": { emoji: "📚", accent: "#16A34A", short: "Syllabus" },
  Library: { emoji: "📕", accent: "#0D9488", short: "Library" },
  Group: { emoji: "💬", accent: "#2563EB", short: "Messages" },
  Groups: { emoji: "💬", accent: "#2563EB", short: "Groups" },
  Messages: { emoji: "💬", accent: "#2563EB", short: "Chat" },
  Notices: { emoji: "✉️", accent: "#E11D48", short: "Circular" },
  Events: { emoji: "🎯", accent: "#EA580C", short: "Activity" },
  Calendar: { emoji: "🗓️", accent: "#0EA5E9", short: "Calendar" },
  Blog: { emoji: "📝", accent: "#0D9488", short: "Blogs" },
  Blogs: { emoji: "📝", accent: "#0D9488", short: "Blogs" },
  "Pay Fee": { emoji: "💳", accent: "#059669", short: "Fees" },
  Fees: { emoji: "💳", accent: "#059669", short: "Fees" },
  "Fee Management": { emoji: "💳", accent: "#059669", short: "Fees" },
  "School Store": { emoji: "🛒", accent: "#D97706", short: "Store" },
  "School Commerce Suite": { emoji: "🛒", accent: "#D97706", short: "Store" },
  "Transport & GPS": { emoji: "🚌", accent: "#0284C7", short: "Transport" },
  Transport: { emoji: "🚌", accent: "#0284C7", short: "Transport" },
  "Transport Management": { emoji: "🚌", accent: "#0284C7", short: "Transport" },
  "Hostel Management": { emoji: "🛏️", accent: "#7C3AED", short: "Hostel" },
  "Gate Pass": { emoji: "🛂", accent: "#0F766E", short: "Gate Pass" },
  "Lead Management": { emoji: "📈", accent: "#DB2777", short: "Leads" },
  "House Allocation": { emoji: "🏠", accent: "#EA580C", short: "House" },
  "Help / Support": { emoji: "🎧", accent: "#D97706", short: "Help" },
  "Help Requests": { emoji: "🎧", accent: "#D97706", short: "Help" },
  "Access Control": { emoji: "🛡️", accent: "#A855F7", short: "Access" },
  School: { emoji: "🏫", accent: "#3B82F6", short: "Schools" },
  "School Detail": { emoji: "🗂️", accent: "#22C55E", short: "Details" },
  "Syllabus Catalog": { emoji: "📚", accent: "#10B981", short: "Catalog" },
  "Platform Analytics": { emoji: "📊", accent: "#4F46E5", short: "Analytics" },
};

const DEFAULT_META = { emoji: "⭐", accent: "#6B7280", short: null };

export function getMenuIconMeta(name) {
  return MENU_ICON_META[name] || { ...DEFAULT_META, short: name };
}

export function getMenuEmoji(name) {
  return getMenuIconMeta(name).emoji;
}
