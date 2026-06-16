import MessageThread from "../models/messagethread.js";
import DirectMessage  from "../models/directmessage.js";
import Teacher from "../models/teacher.js";
import Student from "../models/student.js";
import Staff from "../models/staff.js";
import School from "../models/school.js";
import Class from "../models/class.js";
import Section from "../models/section.js"
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

// ─────────────────────────────────────────────────────────────
// HELPER — extract logged-in user info from JWT (req.user)
// Returns { participantId, participantModel, schoolId, name }
// ─────────────────────────────────────────────────────────────
// const getCallerInfo = (req) => {
//   const { role } = req.user;

//   if (role === "teacher_admin") {
//     return {
//       participantId: req.user.teacher_id,
//       participantModel: "Teacher",
//       schoolId: req.user.school_id,
//     };
//   }

//   if (role === "student_admin") {
//     return {
//       participantId: req.user.student_id,
//       participantModel: "Student",
//       schoolId: req.user.school_id,
//     };
//   }

//   if (role === "staff_admin") {
//     return {
//       participantId: req.user.staff_id,
//       participantModel: "Staff",
//       schoolId: req.user.school_id,
//     };
//   }

//   if (role === "school_admin") {
//     return {
//       participantId: req.user.school_id, // school_admin's ID is the school itself
//       participantModel: "School",
//       schoolId: req.user.school_id,
//     };
//   }

//   return null; // super_admin not supported in messaging for now
// };

// // ─────────────────────────────────────────────────────────────
// // HELPER — get display name + photo from populated participant
// // Handles all 4 models cleanly
// // ─────────────────────────────────────────────────────────────
// const formatParticipant = (participant) => {
//   const doc = participant.participantId; // populated document
//   const model = participant.participantModel;

//   if (!doc) return null;

//   let name = "";
//   let photo = null;
//   let role = model;

//   if (model === "Teacher") {
//     name = doc.fullName || "";
//     photo = doc.photo?.url || null;
//     role = "Teacher";
//   }

//   if (model === "Student") {
//     name = `${doc.firstName || ""} ${doc.lastName || ""}`.trim();
//     photo = doc.documents?.studentPhoto?.url || null;
//     role = "Student";
//   }

//   if (model === "Staff") {
//     name = doc.fullName || "";
//     photo = doc.photo?.url || null;
//     role = doc.staffRole || "Staff";
//   }

//   if (model === "School") {
//     name = doc.school_name || "";
//     photo = doc.school_logo || null;
//     role = "School Admin";
//   }

//   return {
//     _id: doc._id,
//     name,
//     photo,
//     role,
//     model,
//   };
// };


// here is new code update one -
export const getCallerInfo = (req) => {
  const { role } = req.user;

  if (role === "teacher_admin") {
    return {
      participantId: req.user.teacher_id,
      participantModel: "Teacher",
      subType: "default",
      schoolId: req.user.school_id,
    };
  }

  if (role === "student_admin") {
    // loginAs decides if this is student or parent session
    // Both share same student._id but get separate threads via subType
    const subType = req.user.loginAs === "parent" ? "parent" : "student";
    return {
      participantId: req.user.student_id,
      participantModel: "Student",
      subType,
      schoolId: req.user.school_id,
    };
  }

  if (role === "staff_admin") {
    return {
      participantId: req.user.staff_id,
      participantModel: "Staff",
      subType: "default",
      schoolId: req.user.school_id,
    };
  }

  if (role === "school_admin") {
    // school_admin's participantId is the school itself
    return {
      participantId: req.user.school_id,
      participantModel: "School",
      subType: "default",
      schoolId: req.user.school_id,
    };
  }

  // super_admin not supported in messaging
  return null;
};

// ─────────────────────────────────────────────────────────────
// HELPER — get display name + photo from populated participant
// Handles all 4 models + student/parent subType
// ─────────────────────────────────────────────────────────────
export const formatParticipant = (participant) => {
  const doc = participant.participantId; // populated document
  const model = participant.participantModel;
  const subType = participant.subType || "default";

  if (!doc) return null;

  let name = "";
  let photo = null;
  let role = model;
  let extra = {}; // extra info for display (class, section etc)

  if (model === "Teacher") {
    name = doc.fullName || "";
    photo = doc.photo?.url || null;
    role = doc.designation || "Teacher";
  }

  if (model === "Staff") {
    name = doc.fullName || "";
    photo = doc.photo?.url || null;
    // Show custom role if staffRole is "other"
    role = doc.staffRole === "other"
      ? doc.staffRoleCustom || "Staff"
      : doc.staffRole || "Staff";
  }

  if (model === "School") {
    name = doc.school_name || "";
    photo = doc.school_logo || null;
    role = "School Admin";
  }

  if (model === "Student") {
    const studentName =
      `${doc.firstName || ""} ${doc.lastName || ""}`.trim();

    if (subType === "parent") {
      // Show father name if available, else mother name
      const parentName =
        doc.fatherName || doc.motherName || "Parent";
      name = `${parentName} (Parent)`;
      // Show father photo else mother photo else student photo
      photo =
        doc.documents?.fatherPhoto?.url ||
        doc.documents?.motherPhoto?.url ||
        doc.documents?.studentPhoto?.url ||
        null;
      role = "Parent";
      // Extra info — child name + class + section for display
      extra = {
        childName: studentName,
        className: doc.classId?.name || "",
        sectionName: doc.sectionId?.name || "",
      };
    } else {
      // Regular student
      name = studentName;
      photo = doc.documents?.studentPhoto?.url || null;
      role = "Student";
      extra = {
        className: doc.classId?.name || "",
        sectionName: doc.sectionId?.name || "",
      };
    }
  }

  return {
    _id: doc._id,
    name,
    photo,
    role,
    model,
    subType,
    ...extra,
  };
};

//  ============================= part 1 ended ================================================ 

// ─────────────────────────────────────────────────────────────
// @route   POST /api/messages/thread/start
// @desc    Start a new thread or return existing one
// @access  Private
// ─────────────────────────────────────────────────────────────
// export const startOrGetThread = async (req, res) => {
//   try {
//     const caller = getCallerInfo(req);

//     // Validate — role must be supported
//     if (!caller) {
//       return res.status(403).json({
//         success: false,
//         message: "Your role is not supported for messaging.",
//       });
//     }

//     const { targetId, targetModel } = req.body;

//     // Validate — targetId and targetModel are required
//     if (!targetId || !targetModel) {
//       return res.status(400).json({
//         success: false,
//         message: "targetId and targetModel are required.",
//       });
//     }

//     // Validate — targetModel must be one of the allowed models
//     const allowedModels = ["Teacher", "Student", "Staff", "School"];
//     if (!allowedModels.includes(targetModel)) {
//       return res.status(400).json({
//         success: false,
//         message: `targetModel must be one of: ${allowedModels.join(", ")}`,
//       });
//     }

//     // Validate — user cannot message themselves
//     if (caller.participantId.toString() === targetId.toString()) {
//       return res.status(400).json({
//         success: false,
//         message: "You cannot message yourself.",
//       });
//     }

//     // Validate — target user actually exists in the correct model
//     const modelMap = { Teacher, Student, Staff, School };
//     const TargetModel = modelMap[targetModel];
//     const targetExists = await TargetModel.findById(targetId).select("_id schoolId");

//     if (!targetExists) {
//       return res.status(404).json({
//         success: false,
//         message: `${targetModel} not found.`,
//       });
//     }

//     // School isolation — both must belong to same school
//     // School model itself uses _id as schoolId, others have schoolId field
//     const targetSchoolId =
//       targetModel === "School"
//         ? targetExists._id.toString()
//         : targetExists.schoolId?.toString();

//     if (targetSchoolId !== caller.schoolId.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: "You cannot message users from a different school.",
//       });
//     }

//     // Check if thread already exists between these two participants
//     // We match both participant IDs regardless of order
//     const existingThread = await MessageThread.findOne({
//       schoolId: caller.schoolId,
//       "participants.participantId": {
//         $all: [caller.participantId, targetId],
//       },
//     });

//     if (existingThread) {
//       // Thread already exists — return it
//       return res.status(200).json({
//         success: true,
//         message: "Thread already exists.",
//         threadId: existingThread._id,
//       });
//     }

//     // Create new thread
//     const newThread = await MessageThread.create({
//       schoolId: caller.schoolId,
//       participants: [
//         {
//           participantId: caller.participantId,
//           participantModel: caller.participantModel,
//           schoolId: caller.schoolId,
//         },
//         {
//           participantId: targetId,
//           participantModel: targetModel,
//           schoolId: caller.schoolId,
//         },
//       ],
//       lastMessage: "",
//       lastMessageAt: null,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Thread created successfully.",
//       threadId: newThread._id,
//     });
//   } catch (error) {
//     console.error("❌ startOrGetThread error:", error.message);
//     return res.status(500).json({ success: false, message: "Server error." });
//   }
// };

// // ─────────────────────────────────────────────────────────────
// // @route   GET /api/messages/threads
// // @desc    Get all threads (inbox) for logged-in user
// // @access  Private
// // ─────────────────────────────────────────────────────────────
// export const getMyThreads = async (req, res) => {
//   try {
//     const caller = getCallerInfo(req);

//     if (!caller) {
//       return res.status(403).json({
//         success: false,
//         message: "Your role is not supported for messaging.",
//       });
//     }

//     // Fetch all threads where this user is a participant
//     // Sort by latest message first
//     const threads = await MessageThread.find({
//       schoolId: caller.schoolId,
//       "participants.participantId": caller.participantId,
//     })
//       .sort({ lastMessageAt: -1 })
//       .populate({
//         path: "participants.participantId",
//         // Select only fields we need for inbox display
//         select: "fullName photo school_name school_logo firstName lastName documents staffRole",
//       });

//     // For each thread — format the OTHER participant's info
//     // and calculate unread count
//     const formattedThreads = await Promise.all(
//       threads.map(async (thread) => {
//         // Find the other participant (not me)
//         const otherParticipant = thread.participants.find(
//           (p) => p.participantId?._id?.toString() !== caller.participantId.toString()
//         );

//         const otherUser = otherParticipant
//           ? formatParticipant(otherParticipant)
//           : null;

//         // Count unread messages — messages not sent by me and not seen
//         const unreadCount = await DirectMessage.countDocuments({
//           threadId: thread._id,
//           seen: false,
//           senderId: { $ne: caller.participantId },
//         });

//         return {
//           _id: thread._id,
//           otherUser,
//           lastMessage: thread.lastMessage || "",
//           lastMessageAt: thread.lastMessageAt,
//           unreadCount,
//         };
//       })
//     );

//     return res.status(200).json({
//       success: true,
//       threads: formattedThreads,
//     });
//   } catch (error) {
//     console.error("❌ getMyThreads error:", error.message);
//     return res.status(500).json({ success: false, message: "Server error." });
//   }
// };


//   =======================================  part 2 start  =======================================
// ─────────────────────────────────────────────────────────────
// @route   POST /api/message-signal/thread/start
// @desc    Start a new thread or return existing one
// @access  Private
// ─────────────────────────────────────────────────────────────
export const startOrGetThread = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    // Validate — role must be supported
    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { targetId, targetModel, targetSubType } = req.body;

    // Validate — required fields
    if (!targetId || !targetModel) {
      return res.status(400).json({
        success: false,
        message: "targetId and targetModel are required.",
      });
    }

    // Validate — targetModel must be allowed
    const allowedModels = ["Teacher", "Student", "Staff", "School"];
    if (!allowedModels.includes(targetModel)) {
      return res.status(400).json({
        success: false,
        message: `targetModel must be one of: ${allowedModels.join(", ")}`,
      });
    }

    // Determine target subType
    // Only Student model uses student/parent — everything else is default
    const resolvedTargetSubType =
      targetModel === "Student"
        ? targetSubType === "parent"
          ? "parent"
          : "student"
        : "default";

    // Validate — cannot message yourself
    // For student model also check subType (student cant message parent self)
    const isSelf =
      caller.participantId.toString() === targetId.toString() &&
      caller.participantModel === targetModel &&
      caller.subType === resolvedTargetSubType;

    if (isSelf) {
      return res.status(400).json({
        success: false,
        message: "You cannot message yourself.",
      });
    }

    // Validate — target must exist in correct model
    const modelMap = { Teacher, Student, Staff, School };
    const TargetModel = modelMap[targetModel];
    const targetExists = await TargetModel.findById(targetId).select(
      "_id schoolId"
    );

    if (!targetExists) {
      return res.status(404).json({
        success: false,
        message: `${targetModel} not found.`,
      });
    }

    // School isolation — both must belong to same school
    const targetSchoolId =
      targetModel === "School"
        ? targetExists._id.toString()
        : targetExists.schoolId?.toString();

    if (targetSchoolId !== caller.schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot message users from a different school.",
      });
    }

    // ── Check if thread already exists ──────────────────────
    // Must match BOTH participantIds AND their subTypes
    // This ensures student + parent get separate threads
    const existingThread = await MessageThread.findOne({
      schoolId: caller.schoolId,
      participants: {
        $all: [
          {
            $elemMatch: {
              participantId: caller.participantId,
              subType: caller.subType,
            },
          },
          {
            $elemMatch: {
              participantId: targetId,
              subType: resolvedTargetSubType,
            },
          },
        ],
      },
    });

    if (existingThread) {
      return res.status(200).json({
        success: true,
        message: "Thread already exists.",
        threadId: existingThread._id,
      });
    }

    // ── Create new thread ────────────────────────────────────
    const newThread = await MessageThread.create({
      schoolId: caller.schoolId,
      participants: [
        {
          participantId: caller.participantId,
          participantModel: caller.participantModel,
          subType: caller.subType,
          schoolId: caller.schoolId,
        },
        {
          participantId: targetId,
          participantModel: targetModel,
          subType: resolvedTargetSubType,
          schoolId: caller.schoolId,
        },
      ],
      lastMessage: "",
      lastMessageAt: null,
    });

    return res.status(201).json({
      success: true,
      message: "Thread created successfully.",
      threadId: newThread._id,
    });
  } catch (error) {
    console.error("❌ startOrGetThread error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// @route   GET /api/message-signal/threads
// @desc    Get all threads (inbox) for logged-in user
//          Uses subType to separate student vs parent inbox
// @access  Private
// ─────────────────────────────────────────────────────────────
export const getMyThreads = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    // ── Fetch threads for this exact participant + subType ───
    // $elemMatch ensures BOTH participantId AND subType match
    // This is critical — without subType check, student and parent
    // would see each other's threads
    const threads = await MessageThread.find({
      schoolId: caller.schoolId,
      participants: {
        $elemMatch: {
          participantId: caller.participantId,
          subType: caller.subType,
        },
      },
    })
      .sort({ lastMessageAt: -1 })
      .populate({
        path: "participants.participantId",
        select:
          "fullName photo school_name school_logo firstName lastName " +
          "documents staffRole staffRoleCustom designation " +
          "fatherName motherName classId sectionId",
        // Note: classId and sectionId will be populated separately below
      });

    // ── For each thread format the OTHER participant ─────────
    const formattedThreads = await Promise.all(
      threads.map(async (thread) => {
        // Find the other participant — match by participantId AND subType
        // so we correctly identify student vs parent side
        const otherParticipant = thread.participants.find((p) => {
          const idMatch =
            p.participantId?._id?.toString() !==
            caller.participantId.toString();
          // Edge case — same _id but different subType (student vs parent)
          const subTypeMatch = p.subType !== caller.subType;
          return idMatch || subTypeMatch;
        });

        // Populate classId and sectionId for Student participants
        // so formatParticipant can show class + section name
        if (
          otherParticipant?.participantModel === "Student" &&
          otherParticipant?.participantId
        ) {
          const studentDoc = otherParticipant.participantId;
          if (studentDoc.classId) {
            const classDoc = await Class.findById(studentDoc.classId).select(
              "name"
            );
            studentDoc.classId = classDoc;
          }
          if (studentDoc.sectionId) {
  const sectionDoc = await Section.findById(
    studentDoc.sectionId
  ).select("name");
  studentDoc.sectionId = sectionDoc;
}
        }

        const otherUser = otherParticipant
          ? formatParticipant(otherParticipant)
          : null;

        // ── Unread count ─────────────────────────────────────
        // Count messages not sent by me and not seen
        // Use both senderId AND senderSubType to correctly count
        // (parent and student have same senderId)
        const unreadCount = await DirectMessage.countDocuments({
          threadId: thread._id,
          seen: false,
          $or: [
            { senderId: { $ne: caller.participantId } },
            {
              senderId: caller.participantId,
              senderSubType: { $ne: caller.subType },
            },
          ],
        });

        return {
          _id: thread._id,
          otherUser,
          lastMessage: thread.lastMessage || "",
          lastMessageAt: thread.lastMessageAt,
          unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      threads: formattedThreads,
    });
  } catch (error) {
    console.error("❌ getMyThreads error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
//   =======================================  part 2 end  =======================================
// ─────────────────────────────────────────────────────────────
// @route   GET /api/messages/thread/:threadId
// @desc    Get all messages in a thread (chat history)
// @access  Private
// ─────────────────────────────────────────────────────────────
// export const getThreadMessages = async (req, res) => {
//   try {
//     const caller = getCallerInfo(req);

//     if (!caller) {
//       return res.status(403).json({
//         success: false,
//         message: "Your role is not supported for messaging.",
//       });
//     }

//     const { threadId } = req.params;

//     // Validate threadId format
//     if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid thread ID.",
//       });
//     }

//     // Find thread and verify this user is a participant
//     const thread = await MessageThread.findOne({
//       _id: threadId,
//       schoolId: caller.schoolId,
//       "participants.participantId": caller.participantId,
//     });

//     if (!thread) {
//       return res.status(404).json({
//         success: false,
//         message: "Thread not found or you are not a participant.",
//       });
//     }

//     // Fetch messages oldest to newest
//     const messages = await DirectMessage .find({ threadId })
//       .sort({ createdAt: 1 });

//     return res.status(200).json({
//       success: true,
//       messages,
//     });
//   } catch (error) {
//     console.error("❌ getThreadMessages error:", error.message);
//     return res.status(500).json({ success: false, message: "Server error." });
//   }
// };

// // ─────────────────────────────────────────────────────────────
// // @route   POST /api/messages/thread/:threadId/send
// // @desc    Send a message (text or image/file)
// // @access  Private
// // ─────────────────────────────────────────────────────────────
// export const sendMessage = async (req, res) => {
//   try {
//     const caller = getCallerInfo(req);

//     if (!caller) {
//       return res.status(403).json({
//         success: false,
//         message: "Your role is not supported for messaging.",
//       });
//     }

//     const { threadId } = req.params;
//     const { text } = req.body;
//     const file = req.file; // from multer — optional

//     // Validate — must have text or attachment
//     if (!text?.trim() && !file) {
//       return res.status(400).json({
//         success: false,
//         message: "Message must have text or an attachment.",
//       });
//     }

//     // Validate threadId format
//     if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid thread ID.",
//       });
//     }

//     // Verify thread exists and user is a participant
//     const thread = await MessageThread.findOne({
//       _id: threadId,
//       schoolId: caller.schoolId,
//       "participants.participantId": caller.participantId,
//     });

//     if (!thread) {
//       return res.status(404).json({
//         success: false,
//         message: "Thread not found or you are not a participant.",
//       });
//     }

//     // Handle attachment upload if file is present
//     let attachment = {
//       url: null,
//       public_id: null,
//       type: null,
//       name: null,
//     };

//     if (file) {
//       // Upload to cloudinary under messages folder
//       const uploaded = await uploadToCloudinary(file, "messages");
//       attachment = {
//         url: uploaded.url,
//         public_id: uploaded.public_id,
//         type: uploaded.type,
//         name: file.originalname, // save original file name for display
//       };
//     }

//     // Determine senderModel from caller
//     const senderModel = caller.participantModel;

//     // Create the message
//     const newMessage = await DirectMessage .create({
//       threadId,
//       senderId: caller.participantId,
//       senderModel,
//       text: text?.trim() || "",
//       attachment,
//       seen: false,
//     });

//     // Update thread's last message preview and timestamp
//     await MessageThread.findByIdAndUpdate(threadId, {
//       lastMessage: text?.trim()
//         ? text.trim()
//         : `📎 ${file.originalname}`, // show file name if no text
//       lastMessageAt: new Date(),
//       lastMessageSenderId: caller.participantId,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Message sent.",
//       data: newMessage,
//     });
//   } catch (error) {
//     console.error("❌ sendMessage error:", error.message);
//     return res.status(500).json({ success: false, message: "Server error." });
//   }
// };

// // ─────────────────────────────────────────────────────────────
// // @route   PUT /api/messages/thread/:threadId/read
// // @desc    Mark all messages in thread as seen
// // @access  Private
// // ─────────────────────────────────────────────────────────────
// export const markThreadAsRead = async (req, res) => {
//   try {
//     const caller = getCallerInfo(req);

//     if (!caller) {
//       return res.status(403).json({
//         success: false,
//         message: "Your role is not supported for messaging.",
//       });
//     }

//     const { threadId } = req.params;

//     // Validate threadId format
//     if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid thread ID.",
//       });
//     }

//     // Verify thread exists and user is a participant
//     const thread = await MessageThread.findOne({
//       _id: threadId,
//       schoolId: caller.schoolId,
//       "participants.participantId": caller.participantId,
//     });

//     if (!thread) {
//       return res.status(404).json({
//         success: false,
//         message: "Thread not found or you are not a participant.",
//       });
//     }

//     // Mark all messages NOT sent by me as seen
//     // (no point marking my own messages as seen)
//     await DirectMessage.updateMany(
//       {
//         threadId,
//         senderId: { $ne: caller.participantId },
//         seen: false,
//       },
//       { $set: { seen: true } }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Messages marked as read.",
//     });
//   } catch (error) {
//     console.error("❌ markThreadAsRead error:", error.message);
//     return res.status(500).json({ success: false, message: "Server error." });
//   }
// };

// ====================================== part 3 start ===========================================
// ─────────────────────────────────────────────────────────────
// @route   GET /api/message-signal/thread/:threadId
// @desc    Get all messages in a thread (chat history)
// @access  Private
// ─────────────────────────────────────────────────────────────
export const getThreadMessages = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { threadId } = req.params;

    // Validate threadId format
    if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid thread ID.",
      });
    }

    // Verify thread exists and caller is a participant
    // Use $elemMatch to check both participantId AND subType
    // Critical — prevents student from accessing parent's thread
    const thread = await MessageThread.findOne({
      _id: threadId,
      schoolId: caller.schoolId,
      participants: {
        $elemMatch: {
          participantId: caller.participantId,
          subType: caller.subType,
        },
      },
    });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found or you are not a participant.",
      });
    }

    // Fetch messages oldest to newest
    const messages = await DirectMessage.find({ threadId })
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("❌ getThreadMessages error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// @route   POST /api/message-signal/thread/:threadId/send
// @desc    Send a message (text or image/file)
//          senderSubType stored so parent/student msgs distinguished
// @access  Private
// ─────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { threadId } = req.params;
    const { text } = req.body;
    const file = req.file; // from multer — optional

    // Validate — must have text or attachment
    if (!text?.trim() && !file) {
      return res.status(400).json({
        success: false,
        message: "Message must have text or an attachment.",
      });
    }

    // Validate threadId format
    if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid thread ID.",
      });
    }

    // Verify thread exists and caller is a participant
    // $elemMatch checks both participantId AND subType
    const thread = await MessageThread.findOne({
      _id: threadId,
      schoolId: caller.schoolId,
      participants: {
        $elemMatch: {
          participantId: caller.participantId,
          subType: caller.subType,
        },
      },
    });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found or you are not a participant.",
      });
    }

    // ── Handle file upload if present ───────────────────────
    let attachment = {
      url: null,
      public_id: null,
      type: null,
      name: null,
    };

    if (file) {
      const uploaded = await uploadToCloudinary(file, "messages");
      attachment = {
        url: uploaded.url,
        public_id: uploaded.public_id,
        type: uploaded.type,
        name: file.originalname,
      };
    }

    // ── Create message ───────────────────────────────────────
    // senderSubType stored alongside senderId
    // This lets us correctly identify if sender was student or parent
    // when both share the same senderId (_id from Student model)
    const newMessage = await DirectMessage.create({
      threadId,
      senderId: caller.participantId,
      senderModel: caller.participantModel,
      senderSubType: caller.subType, // "student" | "parent" | "default"
      text: text?.trim() || "",
      attachment,
      seen: false,
    });

    // ── Update thread last message info ──────────────────────
    await MessageThread.findByIdAndUpdate(threadId, {
      lastMessage: text?.trim()
        ? text.trim()
        : `📎 ${file.originalname}`,
      lastMessageAt: new Date(),
      lastMessageSenderId: caller.participantId,
      lastMessageSenderSubType: caller.subType,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent.",
      data: newMessage,
    });
  } catch (error) {
    console.error("❌ sendMessage error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// @route   PUT /api/message-signal/thread/:threadId/read
// @desc    Mark all messages in thread as seen
//          Uses senderSubType to avoid marking own messages
// @access  Private
// ─────────────────────────────────────────────────────────────
export const markThreadAsRead = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { threadId } = req.params;

    // Validate threadId format
    if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid thread ID.",
      });
    }

    // Verify thread exists and caller is a participant
    const thread = await MessageThread.findOne({
      _id: threadId,
      schoolId: caller.schoolId,
      participants: {
        $elemMatch: {
          participantId: caller.participantId,
          subType: caller.subType,
        },
      },
    });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found or you are not a participant.",
      });
    }

    // ── Mark unseen messages as seen ─────────────────────────
    // Only mark messages NOT sent by me as seen
    // For student/parent — also check senderSubType
    // so parent doesn't accidentally mark student's messages
    await DirectMessage.updateMany(
      {
        threadId,
        seen: false,
        $or: [
          // Different sender entirely
          { senderId: { $ne: caller.participantId } },
          // Same _id but different subType (student vs parent)
          {
            senderId: caller.participantId,
            senderSubType: { $ne: caller.subType },
          },
        ],
      },
      { $set: { seen: true } }
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as read.",
    });
  } catch (error) {
    console.error("❌ markThreadAsRead error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
// ====================================== part 3 end ===========================================
// ─────────────────────────────────────────────────────────────
// @route   GET /api/messages/users
// @desc    Get list of users for "New Message" page (+ button)
//          Currently returns: Teachers + School Admin
//          Add more roles here later (Staff, Students)
// @access  Private
// ─────────────────────────────────────────────────────────────
// export const getUsersForNewMessage = async (req, res) => {
//   try {
//     const caller = getCallerInfo(req);

//     if (!caller) {
//       return res.status(403).json({
//         success: false,
//         message: "Your role is not supported for messaging.",
//       });
//     }

//     const { schoolId } = caller;

//     // Search query — optional, for the search bar on new message page
//     const search = req.query.search?.trim() || "";
//     const searchRegex = new RegExp(search, "i"); // case insensitive

//     // ── Fetch Teachers ──────────────────────────────────────
//     const teacherQuery = {
//       schoolId,
//       // Exclude the logged-in user if they are a teacher
//       ...(caller.participantModel === "Teacher" && {
//         _id: { $ne: caller.participantId },
//       }),
//       // Apply search on fullName if search query exists
//       ...(search && { fullName: searchRegex }),
//     };

//     const teachers = await Teacher.find(teacherQuery)
//       .select("fullName photo designation schoolId")
//       .limit(50); // reasonable limit

//     // ── Fetch School Admin ──────────────────────────────────
// // Use findById — guarantees only THIS school, never another
// // Skip entirely if caller is school_admin (can't message themselves)
// let schoolAdmins = [];
// if (caller.participantModel !== "School") {
//   const schoolDoc = await School.findById(schoolId)
//     .select("school_name school_logo");

//   if (schoolDoc) {
//     // Apply search filter manually since we're using findById
//     const matchesSearch =
//       !search ||
//       schoolDoc.school_name?.toLowerCase().includes(search.toLowerCase());

//     if (matchesSearch) {
//       schoolAdmins = [
//         {
//           _id: schoolDoc._id,
//           name: schoolDoc.school_name,
//           photo: schoolDoc.school_logo || null,
//           role: "School Admin",
//           model: "School",
//         },
//       ];
//     }
//   }
// }
//     // ── Fetch Staff ─────────────────────────────────────────
//     const staffQuery = {
//       schoolId,
//       status: "Active",
//       ...(caller.participantModel === "Staff" && {
//         _id: { $ne: caller.participantId },
//       }),
//       ...(search && { fullName: searchRegex }),
//     };

//     const staffList = await Staff.find(staffQuery)
//       .select("fullName photo staffRole staffRoleCustom schoolId")
//       .limit(50);

//     // ── Format all into unified shape ───────────────────────
//     const formattedTeachers = teachers.map((t) => ({
//       _id: t._id,
//       name: t.fullName,
//       photo: t.photo?.url || null,
//       role: t.designation || "Teacher",
//       model: "Teacher",
//     }));

//     const formattedSchoolAdmins = schoolAdmins.map((s) => ({
//       _id: s._id,
//       name: s.school_name,
//       photo: s.school_logo || null,
//       role: "School Admin",
//       model: "School",
//     }));

//     const formattedStaff = staffList.map((s) => ({
//       _id: s._id,
//       name: s.fullName,
//       photo: s.photo?.url || null,
//       role: s.staffRole === "other" ? s.staffRoleCustom : s.staffRole,
//       model: "Staff",
//     }));

//     // ── Combine: School Admin first, then Staff, then Teachers
//   const users = [
//   ...schoolAdmins,
//   ...formattedStaff,
//   ...formattedTeachers,
// ];

//     return res.status(200).json({
//       success: true,
//       users,
//     });
//   } catch (error) {
//     console.error("❌ getUsersForNewMessage error:", error.message);
//     return res.status(500).json({ success: false, message: "Server error." });
//   }
// };

//  ====================================== part 4 start ====================================================
// ─────────────────────────────────────────────────────────────
// @route   GET /api/message-signal/users
// @desc    Get list of users for New Message page
//          Results depend on caller's role:
//          school_admin / staff_admin(any) → everyone
//          teacher_admin → school admin, staff, their class students+parents
//          student → school admin, staff, their class teachers
//          parent → school admin, staff, their child's class teachers
// @access  Private
// ─────────────────────────────────────────────────────────────
export const getUsersForNewMessage = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { schoolId } = caller;
    const search = req.query.search?.trim() || "";
    const searchRegex = new RegExp(search, "i");

    // ── Shared result buckets ────────────────────────────────
    let schoolAdmins = [];
    let teachers = [];
    let staffList = [];
    let students = [];
    let parents = [];

    // ─────────────────────────────────────────────────────────
    // CASE 1 — school_admin OR staff_admin
    // Can message everyone in the school
    // Students/parents only shown when search has 2+ chars
    // ─────────────────────────────────────────────────────────
    if (
      caller.participantModel === "School" ||
      caller.participantModel === "Staff"
    ) {
      // ── School Admin ───────────────────────────────────────
      // Only show to staff_admin — school_admin cant message themselves
      if (caller.participantModel === "Staff") {
        const schoolDoc = await School.findById(schoolId).select(
          "school_name school_logo"
        );
        if (schoolDoc) {
          const matchesSearch =
            !search ||
            schoolDoc.school_name
              ?.toLowerCase()
              .includes(search.toLowerCase());
          if (matchesSearch) {
            schoolAdmins = [
              {
                _id: schoolDoc._id,
                name: schoolDoc.school_name,
                photo: schoolDoc.school_logo || null,
                role: "School Admin",
                model: "School",
                subType: "default",
              },
            ];
          }
        }
      }

      // ── Teachers ───────────────────────────────────────────
      const teacherDocs = await Teacher.find({
        schoolId,
        ...(search && { fullName: searchRegex }),
      })
        .select("fullName photo designation")
        .limit(50);

      teachers = teacherDocs.map((t) => ({
        _id: t._id,
        name: t.fullName,
        photo: t.photo?.url || null,
        role: t.designation || "Teacher",
        model: "Teacher",
        subType: "default",
      }));

      // ── Staff ──────────────────────────────────────────────
      // Exclude self if caller is staff
      const staffDocs = await Staff.find({
        schoolId,
        ...(caller.participantModel === "Staff" && {
          _id: { $ne: caller.participantId },
        }),
        ...(search && { fullName: searchRegex }),
      })
        .select("fullName photo staffRole staffRoleCustom")
        .limit(50);

      staffList = staffDocs.map((s) => ({
        _id: s._id,
        name: s.fullName,
        photo: s.photo?.url || null,
        role:
          s.staffRole === "other" ? s.staffRoleCustom || "Staff" : s.staffRole,
        model: "Staff",
        subType: "default",
      }));

      // ── Students + Parents — only when search has 2+ chars ─
      // Avoids loading 1000+ students on empty search
      if (search.length >= 2) {
        const studentDocs = await Student.find({
          schoolId,
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
          ],
        })
          .select(
            "firstName lastName documents classId sectionId fatherName motherName"
          )
          .populate("classId", "name")
          .populate("sectionId", "name")
          .limit(30);

        // Format as students
        students = studentDocs.map((s) => ({
          _id: s._id,
          name: `${s.firstName} ${s.lastName}`.trim(),
          photo: s.documents?.studentPhoto?.url || null,
          role: "Student",
          model: "Student",
          subType: "student",
          className: s.classId?.name || "",
          sectionName: s.sectionId?.name || "",
        }));

        // Format same docs as parents
        parents = studentDocs.map((s) => ({
          _id: s._id,
          name: `${s.fatherName || s.motherName || "Parent"} (Parent)`,
          photo:
            s.documents?.fatherPhoto?.url ||
            s.documents?.motherPhoto?.url ||
            s.documents?.studentPhoto?.url ||
            null,
          role: "Parent",
          model: "Student",
          subType: "parent",
          childName: `${s.firstName} ${s.lastName}`.trim(),
          className: s.classId?.name || "",
          sectionName: s.sectionId?.name || "",
        }));
      }
    }

    // ─────────────────────────────────────────────────────────
    // CASE 2 — teacher_admin
    // Can message: school admin, all staff, students+parents
    // of classes where they are a subject teacher
    // ─────────────────────────────────────────────────────────
    else if (caller.participantModel === "Teacher") {
      // ── School Admin ───────────────────────────────────────
      const schoolDoc = await School.findById(schoolId).select(
        "school_name school_logo"
      );
      if (schoolDoc) {
        const matchesSearch =
          !search ||
          schoolDoc.school_name
            ?.toLowerCase()
            .includes(search.toLowerCase());
        if (matchesSearch) {
          schoolAdmins = [
            {
              _id: schoolDoc._id,
              name: schoolDoc.school_name,
              photo: schoolDoc.school_logo || null,
              role: "School Admin",
              model: "School",
              subType: "default",
            },
          ];
        }
      }

      // ── All Staff ──────────────────────────────────────────
      const staffDocs = await Staff.find({
        schoolId,
        ...(search && { fullName: searchRegex }),
      })
        .select("fullName photo staffRole staffRoleCustom")
        .limit(50);

      staffList = staffDocs.map((s) => ({
        _id: s._id,
        name: s.fullName,
        photo: s.photo?.url || null,
        role:
          s.staffRole === "other" ? s.staffRoleCustom || "Staff" : s.staffRole,
        model: "Staff",
        subType: "default",
      }));

      // ── Other Teachers ─────────────────────────────────────
      const teacherDocs = await Teacher.find({
        schoolId,
        _id: { $ne: caller.participantId }, // exclude self
        ...(search && { fullName: searchRegex }),
      })
        .select("fullName photo designation")
        .limit(50);

      teachers = teacherDocs.map((t) => ({
        _id: t._id,
        name: t.fullName,
        photo: t.photo?.url || null,
        role: t.designation || "Teacher",
        model: "Teacher",
        subType: "default",
      }));

      // ── Students + Parents — only their classes ────────────
      // Step 1: find all classes where this teacher is subject teacher
      if (search.length >= 2) {
        const teacherClasses = await Class.find({
          schoolId,
          "details.subjectTeachers.teacherId": caller.participantId,
        }).select("details");

        // Step 2: collect all sectionIds from those classes
        // where this teacher appears in subjectTeachers
        const sectionIds = [];
        teacherClasses.forEach((cls) => {
          cls.details.forEach((detail) => {
            const isTeacherHere = detail.subjectTeachers.some(
              (st) =>
                st.teacherId?.toString() === caller.participantId.toString()
            );
            if (isTeacherHere && detail.sectionId) {
              sectionIds.push(detail.sectionId);
            }
          });
        });

        if (sectionIds.length > 0) {
          // Step 3: find students in those sections
          const studentDocs = await Student.find({
            schoolId,
            sectionId: { $in: sectionIds },
            $or: [
              { firstName: searchRegex },
              { lastName: searchRegex },
            ],
          })
            .select(
              "firstName lastName documents classId sectionId fatherName motherName"
            )
            .populate("classId", "name")
            .populate("sectionId", "name")
            .limit(30);

          students = studentDocs.map((s) => ({
            _id: s._id,
            name: `${s.firstName} ${s.lastName}`.trim(),
            photo: s.documents?.studentPhoto?.url || null,
            role: "Student",
            model: "Student",
            subType: "student",
            className: s.classId?.name || "",
            sectionName: s.sectionId?.name || "",
          }));

          parents = studentDocs.map((s) => ({
            _id: s._id,
            name: `${s.fatherName || s.motherName || "Parent"} (Parent)`,
            photo:
              s.documents?.fatherPhoto?.url ||
              s.documents?.motherPhoto?.url ||
              s.documents?.studentPhoto?.url ||
              null,
            role: "Parent",
            model: "Student",
            subType: "parent",
            childName: `${s.firstName} ${s.lastName}`.trim(),
            className: s.classId?.name || "",
            sectionName: s.sectionId?.name || "",
          }));
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // CASE 3 — student OR parent
    // Can message: school admin, all staff,
    // only teachers who teach their class section
    // ─────────────────────────────────────────────────────────
    else if (caller.participantModel === "Student") {
      // Fetch the student doc to get classId + sectionId
      const studentDoc = await Student.findById(caller.participantId).select(
        "classId sectionId schoolId"
      );

      if (!studentDoc) {
        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      // ── School Admin ───────────────────────────────────────
      const schoolDoc = await School.findById(schoolId).select(
        "school_name school_logo"
      );
      if (schoolDoc) {
        const matchesSearch =
          !search ||
          schoolDoc.school_name
            ?.toLowerCase()
            .includes(search.toLowerCase());
        if (matchesSearch) {
          schoolAdmins = [
            {
              _id: schoolDoc._id,
              name: schoolDoc.school_name,
              photo: schoolDoc.school_logo || null,
              role: "School Admin",
              model: "School",
              subType: "default",
            },
          ];
        }
      }

      // ── All Staff ──────────────────────────────────────────
      const staffDocs = await Staff.find({
        schoolId,
        ...(search && { fullName: searchRegex }),
      })
        .select("fullName photo staffRole staffRoleCustom")
        .limit(50);

      staffList = staffDocs.map((s) => ({
        _id: s._id,
        name: s.fullName,
        photo: s.photo?.url || null,
        role:
          s.staffRole === "other" ? s.staffRoleCustom || "Staff" : s.staffRole,
        model: "Staff",
        subType: "default",
      }));

      // ── Only teachers who teach this student's class section
      // Step 1: find the class and section
      const classDoc = await Class.findOne({
        _id: studentDoc.classId,
        schoolId,
      }).select("details name");

      if (classDoc) {
        // Step 2: find the matching section detail
        const sectionDetail = classDoc.details.find(
          (d) =>
            d.sectionId?.toString() === studentDoc.sectionId?.toString()
        );

        if (sectionDetail) {
          // Step 3: collect all unique teacherIds from subjectTeachers
          const teacherIds = [
            ...new Set(
              sectionDetail.subjectTeachers
                .filter((st) => st.teacherId)
                .map((st) => st.teacherId.toString())
            ),
          ];

          // Also include class teacher (sectionDetail.teacherId)
          if (
            sectionDetail.teacherId &&
            !teacherIds.includes(sectionDetail.teacherId.toString())
          ) {
            teacherIds.push(sectionDetail.teacherId.toString());
          }

          // Step 4: fetch those teachers
          if (teacherIds.length > 0) {
            const teacherDocs = await Teacher.find({
              _id: { $in: teacherIds },
              schoolId,
              ...(search && { fullName: searchRegex }),
            }).select("fullName photo designation");

            teachers = teacherDocs.map((t) => ({
              _id: t._id,
              name: t.fullName,
              photo: t.photo?.url || null,
              role: t.designation || "Teacher",
              model: "Teacher",
              subType: "default",
            }));
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // COMBINE — consistent order across all roles
    // School Admin → Staff → Teachers → Students → Parents
    // ─────────────────────────────────────────────────────────
    const users = [
      ...schoolAdmins,
      ...staffList,
      ...teachers,
      ...students,
      ...parents,
    ];

    return res.status(200).json({
      success: true,
      users,
      // Tell frontend if student/parent results require search
      requiresSearch:
        caller.participantModel === "School" ||
        caller.participantModel === "Staff" ||
        caller.participantModel === "Teacher",
    });
  } catch (error) {
    console.error("❌ getUsersForNewMessage error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
//  ====================================== part 4 end ====================================================