import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

import SuperAdminMenu from "./pages/SuperAdminMenu";
import Dashboard from "./pages/Dashboard";
import PlatformAnalytics from "./pages/PlatformAnalytics";
import AccessControl from "./pages/AccessControl";
import RoleManagement from "./pages/RoleManagement";
import Schools from "./pages/Schools";
import SchoolManagement from "./pages/SchoolManagement";
import SchoolSubscription from "./pages/SchoolSubscription";
import SchoolView from "./components/SchoolView";
import SchoolDetail from "./pages/SchoolDetail";
import AddSchool from "./pages/AddSchool";

import SchoolMenu from "./pages/SchoolMenu";
import SchoolDashboard from "./pages/SchoolDashboard";
import Students from "./pages/Students";
import StudentManagement from "./pages/StudentManagement";
import StudentView from "./components/StudentView";
import Teachers from "./pages/Teachers";
import TeacherManagement from "./pages/TeacherManagement";
import TeacherView from "./components/TeacherView";
import SectionManagement from "./pages/SectionManagement";
import Class from "./pages/Class";
import ClassView from "./components/ClassView";
import Subject from "./pages/Subject";
import TimeTable from "./pages/TimeTable";
import FeeStructure from "./pages/FeeStructure";
import Event from "./pages/Event";
import EventView from "./components/EventView";
import Notice from "./pages/Notice";
import FeeCollection from "./pages/FeeCollection";
import FeeHistory from "./pages/FeeHistory";
import Defaulters from "./pages/Defaulters";
import Transport from "./pages/Transport";
import DriverManagement from "./pages/DriverManagement";
import BusManagement from "./pages/BusManagement";
import RouteManagement from "./pages/RouteManagement";
import ExamCreate from "./pages/ExamCreate";
import LibraryManagement from "./pages/LibraryManagement";
import Syllabus from "./pages/Syllabus";
import AttendanceReportPrincipal from "./pages/AttendanceReportPrincipal";
import Calendar from "./pages/Calendar";
import Group from "./pages/Group";
import DiaryPrincipal from "./pages/DiaryPrincipal";
import PrincipalResultView from "./pages/PrincipalResultView";

import TeacherMenu from "./pages/TeacherMenu";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherStudents from "./pages/TeacherStudents";
import Assignment from "./pages/Assignment";
import Attendance from "./pages/Attendance";
import AttendanceReportTeacher from "./pages/AttendanceReportTeacher";
import DiaryTeacher from "./pages/DiaryTeacher";
import TeacherAssignmentResult from "./pages/TeacherAssignmentResult";
import ReadTimetable from "./pages/ReadTimetable";
import TeacherExam from "./pages/TeacherExam";

import ParentMenu from "./pages/ParentMenu";
import ParentDashboard from "./pages/ParentDashboard";
import ParentAssignment from "./pages/ParentAssignment";
import ParentAssignmentResult from "./pages/ParentAssignmentResult";
import TeacherCalendar from "./pages/TeacherCalendar";
import ParentResultView from "./pages/ParentResultView";
import DiaryParent from "./pages/DiaryParent";
import ParentFee from "./pages/ParentFee";
import AttendanceParent from "./pages/AttendanceParent";
import MyChild from "./pages/MyChild";
import ParentLibrary from "./pages/ParentLibrary";
import ParentTransport from "./pages/ParentTransport";
import ChangePassword from "./components/ChangePassword";
import NotificationPage from "./pages/NotificationPage";
import Blogs from "./pages/Blogs";
import BlogDetail from "./components/BlogDetail";
import AttendanceWithTabs from "./pages/AttendanceWithTabs";
import StudentAttendanceDetail from "./pages/StudentAttendanceDetail";

const App = () => {
  return (
    <div className="bg-[rgb(var(--bg))] text-[rgb(var(--text))] min-h-screen">
      <Routes>
        {/* Public blog detail — no auth needed */}
        <Route path="/blogs/:id" element={<BlogDetail />} />

        {/* Login */}
        <Route path="/admin/login" element={<Login />} />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute allowedRoles={["student_admin"]}>
              {" "}
              <ChangePassword />{" "}
            </ProtectedRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="menu" element={<SuperAdminMenu />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="platform-analytics" element={<PlatformAnalytics />} />
          <Route path="access-control" element={<AccessControl />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="schools" element={<Schools />} />
          <Route path="add-school" element={<AddSchool />} />
          <Route path="school-manage" element={<SchoolManagement />} />
          <Route path="school-detail" element={<SchoolDetail />} />
          <Route path="subscription-plan" element={<SchoolSubscription />} />
          <Route path="/admin/school-view/:id" element={<SchoolDetail />} />

          <Route path="*" element={<Navigate to="/admin/dashboard" />} />
        </Route>

        <Route
          path="/school"
          element={
            <ProtectedRoute allowedRoles={["school_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="menu" element={<SchoolMenu />} />
          <Route path="dashboard" element={<SchoolDashboard />} />
          <Route path="notification" element={<NotificationPage />} />
          <Route path="students" element={<Students />} />
          <Route path="student-manage" element={<StudentManagement />} />
          <Route path="student-manage/:id" element={<StudentManagement />} />
          <Route path="student-view/:id" element={<StudentView />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="teacher-manage" element={<TeacherManagement />} />
          <Route path="teacher-manage/:id" element={<TeacherManagement />} />
          <Route path="teacher-view/:id" element={<TeacherView />} />
          <Route path="section" element={<SectionManagement />} />
          <Route path="class" element={<Class />} />
          <Route path="class-view/:id" element={<ClassView />} />
          <Route path="subject" element={<Subject />} />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="attendance" element={<AttendanceReportPrincipal />} />
          <Route path="attendance/student/:studentId" element={<StudentAttendanceDetail />} />
          <Route path="timetable" element={<TimeTable />} />
          <Route path="fee-structure" element={<FeeStructure />} />
          <Route path="fee-collection" element={<FeeCollection />} />
          <Route path="fee-history" element={<FeeHistory />} />
          <Route path="defaulters" element={<Defaulters />} />
          <Route path="group" element={<Group />} />
          <Route path="diary" element={<DiaryPrincipal />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventView />} />
          <Route path="notice" element={<Notice />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="transport" element={<Transport />} />
          <Route path="transport-driver" element={<DriverManagement />} />
          <Route path="transport-bus" element={<BusManagement />} />
          <Route path="transport-route" element={<RouteManagement />} />
          <Route path="exam-structure" element={<ExamCreate />} />
          <Route path="exam-marks" element={<PrincipalResultView />} />
          <Route path="library" element={<LibraryManagement />} />
          <Route path="blogs" element={<Blogs />} />

          <Route path="*" element={<Navigate to="/school/dashboard" />} />
        </Route>

        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={["teacher_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="menu" element={<TeacherMenu />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="notification" element={<NotificationPage />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="student-view/:id" element={<StudentView />} />
          <Route path="class" element={<Class />} />
          <Route path="class-view/:id" element={<ClassView />} />
          <Route path="assignment" element={<Assignment />} />
          <Route
            path="assignment/result"
            element={<TeacherAssignmentResult />}
          />
          <Route path="exam" element={<TeacherExam />} />
          <Route path="attendance/mark" element={<AttendanceWithTabs />} />
          <Route path="attendance/student/:studentId" element={<StudentAttendanceDetail />} />
          <Route
            path="attendance/report"
            element={<AttendanceReportTeacher />}
          />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="diary" element={<DiaryTeacher />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventView />} />
          <Route path="notice" element={<Notice />} />
          <Route path="calendar" element={<TeacherCalendar />} />
          <Route path="group" element={<Group />} />
          <Route path="timetable" element={<ReadTimetable />} />
          <Route path="blogs" element={<Blogs />} />

          <Route path="*" element={<Navigate to="/teacher/dashboard" />} />
        </Route>

        <Route
          path="/parent"
          element={
            <ProtectedRoute allowedRoles={["student_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="menu" element={<ParentMenu />} />
          <Route path="dashboard" element={<ParentDashboard />} />
          <Route path="notification" element={<NotificationPage />} />
          <Route path="student" element={<MyChild />} />
          <Route path="assignment" element={<ParentAssignment />} />
          <Route
            path="assignment/result"
            element={<ParentAssignmentResult />}
          />
          <Route path="timetable" element={<ReadTimetable />} />
          <Route path="exam-result" element={<ParentResultView />} />
          <Route path="diary" element={<DiaryParent />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventView />} />
          <Route path="notice" element={<Notice />} />
          <Route path="group" element={<Group />} />
          <Route path="calendar" element={<TeacherCalendar />} />
          <Route path="attendance" element={<AttendanceParent />} />
          <Route path="fees" element={<ParentFee />} />
          <Route path="library" element={<ParentLibrary />} />
          <Route path="transport" element={<ParentTransport />} />
          <Route path="blogs" element={<Blogs />} />
          {/* <Route
          path="timetable"
          element={
            <ReadTimetable
              preselectedClassId={student.classId}
              preselectedDetailId={student.detailId}
              showClassSelector={false}
            />
          }
        /> */}

          <Route path="*" element={<Navigate to="/parent/dashboard" />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/admin/login" />} />
      </Routes>
    </div>
  );
};

export default App;
