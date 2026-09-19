import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./components/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout, { getMenuPath } from "./components/AdminLayout";
import { useAuth } from "./context/AuthContext";

import SuperAdminMenu from "./pages/SuperAdminMenu";
import PlatformAnalytics from "./pages/PlatformAnalytics";
import AccessControl from "./pages/AccessControl";
import Schools from "./pages/Schools";
import SchoolSubscription from "./pages/SchoolSubscription";
import SchoolView from "./components/SchoolView";
import SchoolDetail from "./pages/SchoolDetail";
import AddSchool from "./pages/AddSchool";
import FeeReceipt from "./pages/FeeReceipt";
import FinancialReport from "./pages/FinancialReport";

import SchoolMenu from "./pages/SchoolMenu";
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
import BusGpsTracking from "./pages/BusGpsTracking";
import RouteManagement from "./pages/RouteManagement";
import TransportStops from "./pages/TransportStops";
import TransportAttendants from "./pages/TransportAttendants";
import TransportVendors from "./pages/TransportVendors";
import ExamCreate from "./pages/ExamCreate";
import ClassTest from "./pages/ClassTest";
import SmartExamScheduler from "./pages/SmartExamScheduler";
import ExamPapers from "./pages/ExamPapers";
import ProxyTeacher from "./pages/ProxyTeacher";
import LibraryManagement from "./pages/LibraryManagement";
import HostelManagement from "./pages/HostelManagement";
import HostelBuildings from "./pages/HostelBuildings";
import HostelRooms from "./pages/HostelRooms";
import HostelResidents from "./pages/HostelResidents";
import HostelVisitors from "./pages/HostelVisitors";
import HouseAllocation from "./pages/HouseAllocation";
import CommerceSuite from "./pages/CommerceSuite";
import CommerceInventory from "./pages/CommerceInventory";
import CommerceStore from "./pages/CommerceStore";
import CommerceOrders from "./pages/CommerceOrders";
import Syllabus from "./pages/Syllabus";
import SyllabusCatalogAdmin from "./pages/SyllabusCatalogAdmin";
import SyllabusBooksViewer from "./pages/SyllabusBooksViewer";
import AttendanceReportPrincipal from "./pages/AttendanceReportPrincipal";
import Calendar from "./pages/Calendar";
import Group from "./pages/Group";
import DiaryPrincipal from "./pages/DiaryPrincipal";
import HomeworkSchool from "./pages/HomeworkSchool";
import HomeworkTeacher from "./pages/HomeworkTeacher";
import HomeworkParent from "./pages/HomeworkParent";
import TeacherPageProgress from "./pages/TeacherPageProgress";
import PrincipalResultView from "./pages/PrincipalResultView";
import StaffAttendance from "./pages/StaffAttendance";
import StaffMenu from "./pages/StaffMenu";

import TeacherMenu from "./pages/TeacherMenu";
import TeacherStudents from "./pages/TeacherStudents";
import Assignment from "./pages/Assignment";
import AttendanceReportTeacher from "./pages/AttendanceReportTeacher";
import DiaryTeacher from "./pages/DiaryTeacher";
import TeacherAssignmentResult from "./pages/TeacherAssignmentResult";
import ReadTimetable from "./pages/ReadTimetable";
import TeacherExam from "./pages/TeacherExam";

import StudentMenu from "./pages/StudentMenu";
import ParentMenu from "./pages/ParentMenu";
import ParentAssignment from "./pages/ParentAssignment";
import ParentAssignmentResult from "./pages/ParentAssignmentResult";
import TeacherCalendar from "./pages/TeacherCalendar";
import ParentResultView from "./pages/ParentResultView";
import ReportCard from "./pages/ReportCard";
import IdCard from "./pages/IdCard";
import Certificates from "./pages/Certificates";
import CertificateSettings from "./pages/CertificateSettings";
import DiaryParent from "./pages/DiaryParent";
import ParentFee from "./pages/ParentFee";
import ParentStore from "./pages/ParentStore";
import AttendanceParent from "./pages/AttendanceParent";
import MyChild from "./pages/MyChild";
import ParentStudentCredentials from "./pages/ParentStudentCredentials";
import ParentLibrary from "./pages/ParentLibrary";
import ParentTransport from "./pages/ParentTransport";

import ChangePassword from "./components/ChangePassword";
import NotificationPage from "./pages/NotificationPage";
import Blogs from "./pages/Blogs";
import BlogDetail from "./components/BlogDetail";
import ClassAttendanceMarking from "./pages/ClassAttendanceMarking";
import StudentAttendanceDetail from "./pages/StudentAttendanceDetail";
import StaffManagement from "./pages/StaffManagement";
import SchoolStaffRoles from "./pages/SchoolStaffRoles";
import ParentGatepass from "./pages/ParentGatepass";
import ParentHostelVisit from "./pages/ParentHostelVisit";
import TeacherGatepass from "./pages/TeacherGatepass";
import ParentLeaveRequest from "./pages/ParentLeaveRequest";
import ManageLeaveRequests from "./pages/ManageLeaveRequests";
import MessagesPage from "./pages/messagesingal/MessagePage";
import NewMessagePage from "./pages/messagesingal/NewMessagePage";
import ChatPage from "./pages/messagesingal/ChatPage";
import HelpSupport from "./pages/HelpSupport";
import MarketingDashboard from "./pages/marketing/MarketingDashboard";
import MarketingSuggestions from "./pages/marketing/MarketingSuggestions";
import MarketingCreate from "./pages/marketing/MarketingCreate";
import MarketingApprovals from "./pages/marketing/MarketingApprovals";
import MarketingAccounts from "./pages/marketing/MarketingAccounts";
import SuperAdminAutopilot from "./pages/marketing/SuperAdminAutopilot";
import OauthCallback from "./pages/marketing/OauthCallback";
import BulkStudentUpload from "./pages/BulkStudentUpload";
import LeadManagement from "./pages/LeadManagement";

// message files -


const HomeRedirect = () => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Navigate to={getMenuPath(user.role, user.loginAs)} replace />;
};

const App = () => {
  return (
    <div className="bg-[rgb(var(--bg))] text-[rgb(var(--text))] min-h-screen">
      <Routes>
        {/* Public blog detail — no auth needed */}
        <Route path="/blogs/:id" element={<BlogDetail />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute allowedRoles={["student_admin", "staff_admin"]}>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="menu" element={<SuperAdminMenu />} />
          <Route path="dashboard" element={<Navigate to="/menu" replace />} />
          <Route path="platform-analytics" element={<PlatformAnalytics />} />
          <Route path="access-control" element={<AccessControl />} />
          <Route path="schools" element={<Schools />} />
<Route path="add-school" element={<AddSchool />} />
          <Route path="school-view/:id" element={<SchoolDetail />} />
          <Route path="syllabus-catalog" element={<SyllabusCatalogAdmin />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:threadId" element={<ChatPage />} />
          <Route path="marketing" element={<SuperAdminAutopilot />} />
          <Route path="marketing/accounts" element={<MarketingAccounts />} />
          <Route path="marketing/oauth/callback" element={<OauthCallback />} />

          <Route path="*" element={<Navigate to="/menu" />} />
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
          <Route path="dashboard" element={<Navigate to="/school/menu" replace />} />
          <Route path="notification" element={<NotificationPage />} />
          <Route path="students" element={<Students />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="student-manage" element={<StudentManagement />} />
          <Route path="student-manage/:id" element={<StudentManagement />} />
          <Route path="student-view/:id" element={<StudentView />} />
          <Route path="id-card/student/:id" element={<IdCard />} />
          <Route path="id-card/staff/:id" element={<IdCard />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="certificates/settings" element={<CertificateSettings />} />
          <Route path="students/bulk-upload" element={<BulkStudentUpload />} />
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
          <Route
            path="attendance/student/:studentId"
            element={<StudentAttendanceDetail />}
          />
          <Route path="staff-attendance" element={<StaffAttendance />} />
          <Route path="access-control" element={<SchoolStaffRoles />} />
          <Route path="staff-roles" element={<SchoolStaffRoles />} />
          <Route path="timetable" element={<TimeTable />} />
          <Route path="fee-structure" element={<FeeStructure />} />
          <Route path="fee-collection" element={<FeeCollection />} />
          <Route path="fee-history" element={<FeeHistory />} />
          <Route path="financial-report" element={<FinancialReport />} />
          <Route path="fees/receipt/:paymentId" element={<FeeReceipt />} />
          <Route path="defaulters" element={<Defaulters />} />
          <Route path="group" element={<Group />} />
          <Route path="diary" element={<DiaryPrincipal />} />
          <Route path="homework" element={<HomeworkSchool />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventView />} />
          <Route path="notice" element={<Notice />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="transport" element={<Transport />} />
          <Route path="transport-driver" element={<DriverManagement />} />
          <Route path="transport-bus" element={<BusManagement />} />
          <Route path="transport-gps" element={<BusGpsTracking />} />
          <Route path="transport-route" element={<RouteManagement />} />
          <Route path="transport-stop" element={<TransportStops />} />
          <Route path="transport-attendant" element={<TransportAttendants />} />
          <Route path="transport-vendor" element={<TransportVendors />} />
          <Route path="exam-scheduler" element={<SmartExamScheduler />} />
          <Route path="exam-papers" element={<ExamPapers />} />
          <Route path="class-test" element={<ClassTest />} />
          <Route path="proxy-teacher" element={<ProxyTeacher />} />
          <Route path="exam-marks-entry" element={<TeacherExam />} />
          <Route path="exam-marks" element={<PrincipalResultView />} />
          <Route path="report-card" element={<ReportCard />} />
          <Route path="library" element={<LibraryManagement />} />
          <Route path="hostel" element={<HostelManagement />} />
          <Route path="hostel/buildings" element={<HostelBuildings />} />
          <Route path="hostel/rooms" element={<HostelRooms />} />
          <Route path="hostel/residents" element={<HostelResidents />} />
          <Route path="hostel/visitors" element={<HostelVisitors />} />
          <Route path="house" element={<HouseAllocation />} />
          <Route path="commerce" element={<CommerceSuite />} />
          <Route path="commerce/store" element={<CommerceStore />} />
          <Route path="commerce/orders" element={<CommerceOrders />} />
          <Route path="commerce/:section" element={<CommerceInventory />} />
          <Route path="blogs" element={<Blogs />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/new" element={<NewMessagePage />} />
          <Route path="messages/:threadId" element={<ChatPage />} />
          <Route path="help" element={<HelpSupport />} />
          <Route path="/school/gatepass" element={<TeacherGatepass />}  />
          <Route path="leave-request" element={<ManageLeaveRequests pageTitle="Leave Requests" />} />
          <Route path="marketing" element={<MarketingDashboard />} />
          <Route path="marketing/suggestions" element={<MarketingSuggestions />} />
          <Route path="marketing/create" element={<MarketingCreate />} />
          <Route path="marketing/approvals" element={<MarketingApprovals />} />
          <Route path="marketing/accounts" element={<MarketingAccounts />} />
          <Route path="marketing/oauth/callback" element={<OauthCallback />} />
          <Route path="*" element={<Navigate to="/school/menu" />} />
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
          <Route path="dashboard" element={<Navigate to="/teacher/menu" replace />} />
          <Route path="notification" element={<NotificationPage />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="student-view/:id" element={<StudentView />} />
          <Route path="id-card/student/:id" element={<IdCard />} />
          <Route path="class" element={<Class />} />
          <Route path="class-view/:id" element={<ClassView />} />
          <Route path="assignment" element={<Assignment />} />
          <Route
            path="assignment/result"
            element={<TeacherAssignmentResult />}
          />
          <Route path="exam" element={<TeacherExam />} />
          <Route path="exam-papers" element={<ExamPapers />} />
          <Route path="class-test" element={<ClassTest />} />
          <Route path="report-card" element={<ReportCard />} />
          <Route path="attendance/mark" element={<ClassAttendanceMarking />} />
          <Route
            path="attendance/student/:studentId"
            element={<StudentAttendanceDetail />}
          />
          <Route
            path="attendance/report"
            element={<AttendanceReportTeacher />}
          />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="diary" element={<DiaryTeacher />} />
          <Route path="homework" element={<HomeworkTeacher />} />
          <Route path="page-progress" element={<TeacherPageProgress />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventView />} />
          <Route path="notice" element={<Notice />} />
          <Route path="calendar" element={<TeacherCalendar />} />
          <Route path="group" element={<Group />} />
          <Route path="timetable" element={<ReadTimetable />} />
          <Route path="blogs" element={<Blogs />} />
           <Route path="gatepass" element={<TeacherGatepass />} />
           <Route path="leave-request" element={<ManageLeaveRequests pageTitle="Leave Requests" />} />
           <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/new" element={<NewMessagePage />} />
          <Route path="messages/:threadId" element={<ChatPage />} />
          <Route path="help" element={<HelpSupport />} />
          <Route path="marketing" element={<MarketingDashboard />} />
          <Route path="marketing/suggestions" element={<MarketingSuggestions />} />
          <Route path="marketing/create" element={<MarketingCreate />} />
          <Route path="marketing/approvals" element={<MarketingApprovals />} />
          <Route path="marketing/accounts" element={<MarketingAccounts />} />
          <Route path="marketing/oauth/callback" element={<OauthCallback />} />
          <Route path="*" element={<Navigate to="/teacher/menu" />} />
        </Route>

        {/* ── PARENT ROUTES (loginAs === "parent") ── */}
        <Route
          path="/parent"
          element={
            <ProtectedRoute
              allowedRoles={["student_admin"]}
              requiredLoginAs="parent"
            >
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="menu" element={<ParentMenu />} />
          <Route path="dashboard" element={<Navigate to="/parent/menu" replace />} />
          <Route path="notification" element={<NotificationPage />} />
          <Route path="student" element={<MyChild />} /> {/* child profile */}
          <Route path="credentials" element={<ParentStudentCredentials />} />
          <Route path="fees" element={<ParentFee />} />
          <Route path="fees/receipt/:paymentId" element={<FeeReceipt />} />
          <Route path="store" element={<ParentStore />} />
          <Route path="transport" element={<ParentTransport />} />
          <Route path="exam-result" element={<ParentResultView />} />
          <Route path="report-card" element={<ReportCard />} />
          <Route path="id-card" element={<IdCard />} />
          <Route path="notice" element={<Notice />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventView />} />
          <Route path="calendar" element={<TeacherCalendar />} />
          <Route path="blogs" element={<Blogs />} />
           <Route path="gatepass" element={<ParentGatepass />} />
           <Route path="leave-request" element={<ParentLeaveRequest />} />
           <Route path="hostel-visit" element={<ParentHostelVisit />} />
           <Route path="homework" element={<HomeworkParent />} />
           <Route path="assignment" element={<ParentAssignment />} />
           <Route
             path="assignment/result"
             element={<ParentAssignmentResult />}
           />
           <Route path="syllabus-books" element={<SyllabusBooksViewer />} />
           <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/new" element={<NewMessagePage />} />
          <Route path="messages/:threadId" element={<ChatPage />} />
          <Route path="help" element={<HelpSupport />} />
          <Route path="*" element={<Navigate to="/parent/menu" />} />
        </Route>

        {/* ── STUDENT ROUTES (loginAs === "student") ── */}
        <Route
          path="/student"
          element={
            <ProtectedRoute
              allowedRoles={["student_admin"]}
              requiredLoginAs="student"
            >
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="menu" element={<StudentMenu />} />
          {/* reuse or make StudentMenu */}
          <Route path="dashboard" element={<Navigate to="/student/menu" replace />} />
          {/* reuse or make StudentDashboard */}
          <Route path="notification" element={<NotificationPage />} />
          <Route path="attendance" element={<AttendanceParent />} />
          <Route path="timetable" element={<ReadTimetable />} />
          <Route path="assignment" element={<ParentAssignment />} />
          <Route
            path="assignment/result"
            element={<ParentAssignmentResult />}
          />
          <Route path="exam-result" element={<ParentResultView />} />
          <Route path="report-card" element={<ReportCard />} />
          <Route path="id-card" element={<IdCard />} />
          <Route path="diary" element={<DiaryParent />} />
          <Route path="homework" element={<HomeworkParent />} />
          <Route path="syllabus-books" element={<SyllabusBooksViewer />} />
          <Route path="library" element={<ParentLibrary />} />
          <Route path="group" element={<Group />} />
          <Route path="notice" element={<Notice />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventView />} />
          <Route path="calendar" element={<TeacherCalendar />} />
          <Route path="blogs" element={<Blogs />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/new" element={<NewMessagePage />} />
          <Route path="messages/:threadId" element={<ChatPage />} />
          <Route path="help" element={<HelpSupport />} />
          <Route path="*" element={<Navigate to="/student/menu" />} />
        </Route>

        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["staff_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* always accessible */}
          <Route path="menu" element={<StaffMenu />} />
          <Route path="dashboard" element={<Navigate to="/staff/menu" replace />} />
          <Route path="notification" element={<NotificationPage />} />
          <Route path="notice" element={<Notice />} />
          <Route path="event" element={<Event />} />
          <Route path="event/:id" element={<EventView />} />
          <Route path="calendar" element={<TeacherCalendar />} />
          <Route path="id-card" element={<IdCard />} />
          <Route path="id-card/student/:id" element={<IdCard />} />
          <Route path="id-card/staff/:id" element={<IdCard />} />

          {/* module gated pages — reuse existing components where possible */}
          <Route path="students" element={<Students />} />
          <Route path="student-manage" element={<StudentManagement />} />
          <Route path="student-manage/:id" element={<StudentManagement />} />
          <Route path="student-view/:id" element={<StudentView />} />
          <Route path="attendance" element={<StaffAttendance />} />
          <Route path="fees" element={<FeeCollection />} />
          <Route path="fee-history" element={<FeeHistory />} />
          <Route path="financial-report" element={<FinancialReport />} />
          <Route path="fees/receipt/:paymentId" element={<FeeReceipt />} />
          <Route path="defaulters" element={<Defaulters />} />
          <Route path="library" element={<LibraryManagement />} />
          <Route path="house" element={<HouseAllocation />} />
          <Route path="transport" element={<Transport />} />
          <Route path="transport-driver" element={<DriverManagement />} />
          <Route path="transport-bus" element={<BusManagement />} />
          <Route path="transport-route" element={<RouteManagement />} />
          <Route path="transport-stop" element={<TransportStops />} />
          <Route path="transport-attendant" element={<TransportAttendants />} />
          <Route path="transport-vendor" element={<TransportVendors />} />
          <Route path="hostel" element={<HostelManagement />} />
          <Route path="hostel/buildings" element={<HostelBuildings />} />
          <Route path="hostel/rooms" element={<HostelRooms />} />
          <Route path="hostel/residents" element={<HostelResidents />} />
          <Route path="hostel/visitors" element={<HostelVisitors />} />
          <Route path="gatepass" element={<TeacherGatepass />} />
          <Route path="leave-request" element={<ManageLeaveRequests pageTitle="Leave Requests" />} />
          <Route path="timetable" element={<ReadTimetable />} />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="diary" element={<DiaryPrincipal />} />
          <Route path="homework" element={<HomeworkSchool />} />
          <Route path="exams" element={<ExamCreate />} />
          <Route path="exam-marks" element={<TeacherExam />} />
          <Route path="report-card" element={<ReportCard />} />
          <Route path="assignments" element={<Assignment />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="group" element={<Group />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="staff-roles" element={<SchoolStaffRoles />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="teacher-manage" element={<TeacherManagement />} />
          <Route path="teacher-manage/:id" element={<TeacherManagement />} />
          <Route path="teacher-view/:id" element={<TeacherView />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/new" element={<NewMessagePage />} />
          <Route path="messages/:threadId" element={<ChatPage />} />
          <Route path="marketing" element={<MarketingDashboard />} />
          <Route path="marketing/suggestions" element={<MarketingSuggestions />} />
          <Route path="marketing/create" element={<MarketingCreate />} />
          <Route path="marketing/approvals" element={<MarketingApprovals />} />
          <Route path="marketing/accounts" element={<MarketingAccounts />} />
          <Route path="marketing/oauth/callback" element={<OauthCallback />} />

          <Route path="*" element={<Navigate to="/staff/menu" />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </div>
  );
};

export default App;