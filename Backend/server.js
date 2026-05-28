import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        process.env.CLIENT_URL,
        "capacitor://localhost",
        "http://localhost",
        "https://localhost",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5173",
        "https://localhost:5174",
        "http://10.0.2.2",
      ];
      // Allow requests with no origin (native Android WebView sends null/no origin)
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("trust proxy", 1);

// DB
connectDB();

// Health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "Admin Backend Running" });
});

// Routes (will wire later)
import authRoutes from "./routes/authRoute.js";

import accessRoutes from "./routes/accessRoute.js";
import roleRoutes from "./routes/roleRoute.js";
import schoolRoutes from "./routes/schoolRoute.js";
import subscriptionRoutes from "./routes/subscriptionRoute.js";

import studentRoutes from "./routes/studentRoute.js";
import teacherRoutes from "./routes/teacherRoute.js";
import sectionRoute from "./routes/sectionRoute.js";
import classRoute from "./routes/classRoute.js";
import subjectRoute from "./routes/subjectRoute.js";
import timetableRoute from "./routes/timetableRoute.js";
import feeRoute from "./routes/feeRoute.js";
import eventRoute from "./routes/eventRoute.js";
import noticeRoute from "./routes/noticeRoute.js";
import transportRoute from "./routes/transportRoute.js";
import examRoute from "./routes/examRoute.js";
import libraryRoute from "./routes/libraryRoute.js";
import syllabusRoute from "./routes/syllabusRoute.js";
import teacherAcademicRoute from "./routes/teacherAcademicRoute.js";
import assignmentRoute from "./routes/assignmentRoute.js";
import termRoute from "./routes/termRoute.js";
import attendanceRoute from "./routes/attendanceRoute.js";
import calendarRoute from "./routes/caledarRoute.js";
import diaryRoute from "./routes/diaryRoute.js";
import messageRoute from "./routes/messageRoute.js";
import groupRoute from "./routes/groupRoute.js";
import notificationRoute from "./routes/notificationRoute.js";
import blogRoute from "./routes/blogRoute.js";

import { authMiddleware } from "./auth/auth.js";

app.get("/api/auth/me", authMiddleware, (req, res) => {
  if (req.user.role === "super_admin") {
    return res.json({
      success: true,
      user: {
        email: req.user.email,
        role: req.user.role,
      },
    });
  } else if (req.user.role === "school_admin") {
    return res.json({
      success: true,
      user: {
        email: req.user.email,
        role: req.user.role,
        school_id: req.user.school_id,
        name: req.user.name,
        _id: req.user._id,
      },
    });
  } else if (req.user.role === "teacher_admin") {
    return res.json({
      success: true,
      user: {
        email: req.user.email,
        role: req.user.role,
        school_id: req.user.school_id,
        teacher_id: req.user.teacher_id,
        name: req.user.name,
        _id: req.user._id,
      },
    });
  } else if (req.user.role === "student_admin") {
    return res.json({
      success: true,
      user: {
        username: req.user.username,
        role: req.user.role,
        school_id: req.user.school_id,
        student_id: req.user.student_id,
        name: req.user.name,
        _id: req.user._id,
      },
    });
  } else {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  // If using sessions
  req.session?.destroy();

  res.status(200).json({ message: "Logged out" });
});

app.use("/api/auth", authRoutes);

app.use("/api/access", accessRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/sections", sectionRoute);
app.use("/api/classes", classRoute);
app.use("/api/subjects", subjectRoute);
app.use("/api/timetable", timetableRoute);
app.use("/api/fee-structure", feeRoute);
app.use("/api/fee-collect", feeRoute);
app.use("/api/fee-history", feeRoute);
app.use("/api/fees", feeRoute);
app.use("/api/events", eventRoute);
app.use("/api/notices", noticeRoute);
app.use("/api/transport", transportRoute);
app.use("/api/exam", examRoute);
app.use("/api/library", libraryRoute);
app.use("/api/syllabus", syllabusRoute);
app.use("/api/teacher-academic", teacherAcademicRoute);
app.use("/api/assignment", assignmentRoute);
app.use("/api/terms", termRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/calendar", calendarRoute);
app.use("/api/diary", diaryRoute);
app.use("/api/messages", messageRoute);
app.use("/api/groups", groupRoute);
app.use("/api/notifications", notificationRoute)
app.use("/api/blogs", blogRoute);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// app.get("/api/auth/me", authMiddleware, async (req, res) => {
//   try {
//     const access = await getPermissionsForRole(req.user.role);

//     if (req.user.role === "super_admin") {
//       return res.json({
//         success: true,
//         user: {
//           email: req.user.email,
//           role: req.user.role,
//           access,
//         },
//       });
//     } else if (req.user.role === "school_admin") {
//       return res.json({
//         success: true,
//         user: {
//           email: req.user.email,
//           role: req.user.role,
//           school_id: req.user.school_id,
//           name: req.user.name,
//           access,
//         },
//       });
//     } else if (req.user.role === "teacher_admin") {
//       return res.json({
//         success: true,
//         user: {
//           email: req.user.email,
//           role: req.user.role,
//           school_id: req.user.school_id,
//           teacher_id: req.user.teacher_id,
//           name: req.user.name,
//           access,
//         },
//       });
//     } else if (req.user.role === "student_admin") {
//       return res.json({
//         success: true,
//         user: {
//           username: req.user.username,
//           role: req.user.role,
//           school_id: req.user.school_id,
//           student_id: req.user.student_id,
//           name: req.user.name,
//           access,
//         },
//       });
//     }

//     return res.status(401).json({ success: false, message: "Unauthorized" });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// });
