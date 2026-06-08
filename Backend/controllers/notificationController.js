
// // import Notification from "../models/notification.js";
// // import Student from "../models/student.js"; // adjust import paths to your project

// // // ─── HELPER: reusable function to create a notification programmatically ───────
// // // Call this from exam/result controllers to auto-create notifications
// // export const createNotificationHelper = async ({
// //   title, message, notificationType = 'general',
// //   targetType = 'all', roles = [], classId = null, schoolId = null, createdBy = null,
// //   studentId = null, teacherId= null , sectionId =null,startingDate =null,endingDate=null
// //   ,targets=[]
// // }) => { 
// //   const resolvedTargets = targets.map(t => ({ ...t, schoolId }));
// //   const notification = new Notification({
// //     title, message, notificationType,
// //     createdBy,
// //    targets: resolvedTargets,
// //    startingDate,endingDate,
// //   });
// //   await notification.save();
// //   return notification;
// // };

// // // ─── CREATE: Admin manually sends a notification ───────────────────────────────
// // export const createNotification = async (req, res) => {
// //   try {
// //     const { title, message, notificationType, target ,startingDate,endingDate} = req.body;
// //     // target looks like: { type: 'class', classId: '...', schoolId: '...' }
// //     // or:                { type: 'role', roles: ['teacher_admin'] }
// //     // or:                { type: 'all' }
// //     console.log("Creating notification with target:", startingDate,endingDate);

// //     const notification = new Notification({
// //       title,
// //       message,
// //       notificationType: notificationType || 'general',
// //       startingDate,
// //       endingDate,
// //       createdBy: req.user._id,
// //       targets: target || { type: 'all' },
// //       schoolId:req.user.school_id, 
// //     });

// //     await notification.save();
// //     res.status(201).json({ message: "Notification sent!", notification });
// //   } catch (err) {
// //     res.status(500).json({ error: "Failed to create notification" });
// //   }
// // };

// // // ─── GET: Fetch notifications visible to the logged-in user ───────────────────
// // export const getAllNotifications = async (req, res) => {
// //   try {
// //     const user = req.user;
// //     let targetQuery = {};

// //     // ── SUPER ADMIN: sees everything ───────────────────────────────────────────
// //     if (user.role === 'super_admin') {
// //       targetQuery = {}; // no filter, all notifications
// //     }

// //     // ── SCHOOL ADMIN: sees all notifications belonging to their school ─────────
// //     else if (user.role === 'school_admin') {
// //       targetQuery = {
// //         $or: [
// //           { 'targets.type': 'all' },
// //           { 'targets.roles': 'school_admin' },
// //           { 'targets.schoolId': user.school_id }, // everything scoped to this school
// //         ]
// //       };
// //     }

// //     // ── TEACHER ADMIN: only 'all' + teacher-role notifications ────────────────
// //     else if (user.role === 'teacher_admin') {
// //       targetQuery = {
// //         $and: [
// //           {
// //             $or: [
// //               { 'targets.type': 'all' },
// //               { 'targets.roles': 'teacher_admin' },
// //               { 'targets.teacherId': user.teacher_id },
// //             ]
// //           },
// //           {
// //             $or: [
// //               { 'targets.schoolId': user.school_id },
// //               { 'targets.type': 'all' },
// //             ]
// //           }
// //         ]
// //       };
// //     }

// //     // ── STUDENT / PARENT: only their own + class + 'all' ─────────────────────
// //     else if (user.role === 'student_admin') {
// //       const orConditions = [
// //         { 'targets.type': 'all' },
// //         { 'targets.roles': 'student_admin' },
// //         { 'targets.studentId': user.student_id }, // personal (book issue, fee, etc.)
// //       ];

// //       if (user.student_id) {
// //         const student = await Student.findById(user.student_id).select('classId');
// //         if (student?.classId) {
// //           orConditions.push({ 'targets.classId': student.classId }); // class exam etc.
// //         }
// //       }

// //       targetQuery = {
// //         $and: [
// //           { $or: orConditions },
// //           {
// //             $or: [
// //               { 'targets.schoolId': user.school_id },
// //               { 'targets.type': 'all' },
// //               { 'targets.studentId': user.student_id }, // personal always passes scope check
// //             ]
// //           }
// //         ]
// //       };
// //     }

// //     const notifications = await Notification.find({
// //       ...targetQuery,
// //       clearedBy: { $ne: user._id },
// //     }).sort({ createdAt: -1 }).limit(50);

// //     res.status(200).json(notifications);
// //   } catch (err) {
// //     res.status(500).json({ error: "Failed to fetch notifications" });
// //   }
// // };

// // // ─── MARK AS READ ─────────────────────────────────────────────────────────────
// // export const markAsRead = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const userId = req.user._id;

// //     const updated = await Notification.findByIdAndUpdate(
// //       id,
// //       { $addToSet: { readBy: userId } },
// //       { new: true }
// //     );

// //     if (!updated) return res.status(404).json({ error: "Notification not found" });
// //     res.status(200).json({ message: "Marked as read" });
// //   } catch (err) {
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // };

// // // ─── MARK ALL AS READ ─────────────────────────────────────────────────────────
// // export const markAllAsRead = async (req, res) => {
// //   try {
// //     const userId = req.user._id;
// //     await Notification.updateMany(
// //       { readBy: { $ne: userId } },
// //       { $addToSet: { readBy: userId } }
// //     );
// //     res.status(200).json({ message: "All marked as read" });
// //   } catch (err) {
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // };

// // export const clearAllNotifications = async (req, res) => {
// //   console.log("Clearing notifications for user:", req.user);
// //   try {
// //     const userId = req.user._id;

// //     await Notification.updateMany(
// //       { clearedBy: { $ne: userId } },          // only ones not already cleared
// //       { $addToSet: { clearedBy: userId } }      // add user to clearedBy
// //     );

// //     res.status(200).json({ message: "All notifications cleared" });
// //   } catch (err) {
// //     res.status(500).json({ error: "Failed to clear notifications" });
// //   }
// // };

// import Notification from "../models/notification.js";
// import Student from "../models/student.js";

// // ─── HELPER: reusable function to create a notification programmatically ───────
// export const createNotificationHelper = async ({
//   title, message, notificationType = 'general',
//   targetType = 'all', roles = [], classId = null, schoolId = null, createdBy = null,
//   studentId = null, teacherId = null, sectionId = null, startingDate = null, endingDate = null,
//   targets = []
// }) => {
//   // Always inject schoolId into every target so school scoping works at query time
//   const resolvedTargets = targets.map(t => ({
//     ...t,
//     ...(schoolId ? { schoolId } : {}),
//   }));

//   const notification = new Notification({
//     title, message, notificationType,
//     createdBy,
//     targets: resolvedTargets,
//     startingDate, endingDate,
//   });

//   await notification.save();
//   return notification;
// };

// // ─── CREATE: Admin manually sends a notification ───────────────────────────────
// export const createNotification = async (req, res) => {
//   try {
//     const { title, message, notificationType, target, startingDate, endingDate } = req.body;
//     const schoolId = req.user.school_id; // undefined for super_admin — that's intentional

//     // Normalize target to an array (frontend may send a single object or an array)
//     const rawTargets = Array.isArray(target) ? target : [target || { type: 'all' }];

//     // Inject schoolId into every target so getAllNotifications can scope by school
//     const targets = rawTargets.map(t => ({
//       ...t,
//       ...(schoolId ? { schoolId } : {}),
//     }));

//     const notification = new Notification({
//       title,
//       message,
//       notificationType: notificationType || 'general',
//       startingDate,
//       endingDate,
//       createdBy: req.user._id,
//       targets,
//     });

//     await notification.save();
//     res.status(201).json({ message: "Notification sent!", notification });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to create notification" });
//   }
// };

// // ─── GET: Fetch notifications visible to the logged-in user ───────────────────
// export const getAllNotifications = async (req, res) => {
//   try {
//     const user = req.user;
//     let targetQuery = {};

//     // ── SUPER ADMIN: sees everything ───────────────────────────────────────────
//     if (user.role === 'super_admin') {
//       targetQuery = {};
//     }

//     // ── SCHOOL ADMIN ───────────────────────────────────────────────────────────
//     // Must belong to this school, then match type or role
//     else if (user.role === 'school_admin') {
//       targetQuery = {
//         'targets.schoolId': user.school_id,
//         $or: [
//           { 'targets.type': 'all' },
//           { 'targets.roles': 'school_admin' },
//         ],
//       };
//     }

//     // ── TEACHER ADMIN ──────────────────────────────────────────────────────────
//     // Must belong to this school, then match type, role, or personal teacherId
//     else if (user.role === 'teacher_admin') {
//       targetQuery = {
//         'targets.schoolId': user.school_id,
//         $or: [
//           { 'targets.type': 'all' },
//           { 'targets.roles': 'teacher_admin' },
//           { 'targets.teacherId': user.teacher_id },
//         ],
//       };
//     }

//     // ── STUDENT / PARENT ───────────────────────────────────────────────────────
//     // Must belong to this school, then match type, role, personal studentId, or classId
//     else if (user.role === 'student_admin') {
//       const orConditions = [
//         { 'targets.type': 'all' },
//         { 'targets.roles': 'student_admin' },
//         { 'targets.studentId': user.student_id },
//       ];

//       // Also include class-level notifications (exams, timetables, etc.)
//       if (user.student_id) {
//         const student = await Student.findById(user.student_id).select('classId');
//         if (student?.classId) {
//           orConditions.push({ 'targets.classId': student.classId });
//         }
//       }

//       targetQuery = {
//         'targets.schoolId': user.school_id,
//         $or: orConditions,
//       };
//     }

//     const notifications = await Notification.find({
//       ...targetQuery,
//       clearedBy: { $ne: user._id },
//     })
//       .sort({ createdAt: -1 })
//       .limit(50);

//     res.status(200).json(notifications);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch notifications" });
//   }
// };

// // ─── MARK AS READ ─────────────────────────────────────────────────────────────
// export const markAsRead = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;

//     const updated = await Notification.findByIdAndUpdate(
//       id,
//       { $addToSet: { readBy: userId } },
//       { new: true }
//     );

//     if (!updated) return res.status(404).json({ error: "Notification not found" });
//     res.status(200).json({ message: "Marked as read" });
//   } catch (err) {
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// // ─── MARK ALL AS READ ─────────────────────────────────────────────────────────
// export const markAllAsRead = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     await Notification.updateMany(
//       { readBy: { $ne: userId } },
//       { $addToSet: { readBy: userId } }
//     );
//     res.status(200).json({ message: "All marked as read" });
//   } catch (err) {
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// // ─── CLEAR ALL ─────────────────────────────────────────────────────────────────
// export const clearAllNotifications = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     await Notification.updateMany(
//       { clearedBy: { $ne: userId } },
//       { $addToSet: { clearedBy: userId } }
//     );
//     res.status(200).json({ message: "All notifications cleared" });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to clear notifications" });
//   }
// };


import Notification from "../models/notification.js";
import Student from "../models/student.js";

// ─── HELPER: build the per-role target match using $elemMatch ─────────────────
// $elemMatch ensures schoolId AND type/role come from the SAME target subdocument.
// Without it MongoDB checks each condition independently across the array,
// causing false positives (e.g. one target has schoolId, another has type:'all').
const buildTargetQuery = async (user) => {
  const { role, school_id, teacher_id, student_id } = user;

  if (role === 'super_admin') return {}; // sees everything

  if (role === 'school_admin') {
    return {
      targets: {
        $elemMatch: {
          schoolId: school_id,
          $or: [
            { type: 'all' },
            { roles: 'school_admin' },
          ],
        },
      },
    };
  }

  if (role === 'teacher_admin') {
    return {
      targets: {
        $elemMatch: {
          schoolId: school_id,
          $or: [
            { type: 'all' },
            { roles: 'teacher_admin' },
            { teacherId: teacher_id },
          ],
        },
      },
    };
  }

  if (role === 'student_admin') {
    const orConditions = [
      { type: 'all' },
      { roles: 'student_admin' },
      { studentId: student_id },
    ];

    // Add classId condition if student has a class
    if (student_id) {
      const student = await Student.findById(student_id).select('classId');
      if (student?.classId) {
        orConditions.push({ classId: student.classId });
      }
    }

    return {
      targets: {
        $elemMatch: {
          schoolId: school_id,
          $or: orConditions,
        },
      },
    };
  }

  return {};
};

// ─── HELPER: create a notification programmatically ──────────────────────────
// Call this from exam/result/fee controllers to auto-create notifications
export const createNotificationHelper = async ({
  title, message, notificationType = 'general',
  createdBy = null, schoolId = null,
  startingDate = null, endingDate = null,
  targets = [],
}) => {
  // Always inject schoolId into every target for correct scoping
  const resolvedTargets = targets.map((t) => ({
    ...t,
    ...(schoolId ? { schoolId } : {}),
  }));

  const notification = new Notification({
    title, message, notificationType,
    createdBy,
    targets: resolvedTargets,
    startingDate, endingDate,
  });

  await notification.save();
  return notification;
};

// ─── CREATE: school admin manually sends a notification ──────────────────────
export const createNotification = async (req, res) => {
  try {
    const { title, message, notificationType, target, startingDate, endingDate } = req.body;
    const schoolId = req.user.school_id; // undefined for super_admin — intentional

    // Normalize to array and inject schoolId into every target subdoc
    const rawTargets = Array.isArray(target) ? target : [target || { type: 'all' }];
    const targets = rawTargets.map((t) => ({
      ...t,
      ...(schoolId ? { schoolId } : {}),
    }));

    const notification = new Notification({
      title,
      message,
      notificationType: notificationType || 'general',
      startingDate,
      endingDate,
      createdBy: req.user._id,
      targets,
    });

    await notification.save();
    res.status(201).json({ message: "Notification sent!", notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

// ─── GET TOPBAR: notifications excluding dismissedBy ─────────────────────────
// Used by the topbar dropdown — dismissed ones are hidden here but NOT on the page
export const getTopbarNotifications = async (req, res) => {
  try {
    const user = req.user;
    const targetQuery = await buildTargetQuery(user);

    const notifications = await Notification.find({
      ...targetQuery,
      dismissedBy: { $ne: user._id || req.user.id }, // hide dismissed ones from topbar only
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// ─── GET PAGE: ALL notifications regardless of dismissedBy ───────────────────
// Used by the Notification Page — shows full history, dismissed ones included
export const getAllNotifications = async (req, res) => {
  try {
    const user = req.user;
    const targetQuery = await buildTargetQuery(user);

    const notifications = await Notification.find(targetQuery)
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// ─── MARK ONE AS READ ────────────────────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const updated = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { readBy: userId } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Notification not found" });
    res.status(200).json({ message: "Marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── MARK ALL AS READ ────────────────────────────────────────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    const user = req.user;
    const targetQuery = await buildTargetQuery(user);

    // Only mark the notifications this user can actually see
    await Notification.updateMany(
      { ...targetQuery, readBy: { $ne: user._id  || user.id } },
      { $addToSet: { readBy: user._id || user.id } }
    );

    res.status(200).json({ message: "All marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── DISMISS ALL (topbar clear) ───────────────────────────────────────────────
// Adds userId to dismissedBy — hides from topbar dropdown only.
// Notifications remain fully visible on the Notification Page.
export const dismissAllNotifications = async (req, res) => {
  try {
    const user = req.user;
    const targetQuery = await buildTargetQuery(user);
    
    const not =  await Notification.updateMany(
      { ...targetQuery, dismissedBy: { $ne: user._id || user.id } },
      { $addToSet: { dismissedBy: user._id  || user.id} }
    );

    res.status(200).json({ message: "All notifications dismissed from topbar" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to dismiss notifications" });
  }
};