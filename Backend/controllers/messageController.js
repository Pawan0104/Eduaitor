import mongoose from "mongoose";
import Message from "../models/message.js";
import Group from "../models/group.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";

// ─── Auth normalizer ───────────────────────────────────────────

const normalizeUser = (jwtUser) => {
  const userType =
    jwtUser.role === "teacher_admin"
      ? "teacher"
      : jwtUser.role === "school_admin"
        ? "admin"
        : null;

  const userId = jwtUser.teacher_id || jwtUser.school_id;
  const schoolId = jwtUser.school_id;

  return { userId, userType, schoolId };
};

// ─── Helpers ───────────────────────────────────────────────────

const verifyGroupAccess = async (groupId, schoolId, userId, userType) => {
  const group = await Group.findOne({
    _id: groupId,
    schoolId,
    status: "Active",
  });

  if (!group) return { error: "Group not found", status: 404 };

  const isMember = group.members.some(
    (m) => m.userId.toString() === userId.toString(),
  );

  if (!isMember && userType !== "admin") {
    return { error: "Not a member of this group", status: 403 };
  }

  return { group };
};

// ─── Message CRUD ────────────────────────────────────────────────────────────────

/**
 * POST /messages/create
 * Body: { groupId, text, file? }
 */
export const sendMessage = async (req, res) => {
  try {
    const { userId, userType, schoolId } = normalizeUser(req.user);

    // 🔒 Only teacher & admin
    if (!["teacher", "admin"].includes(userType)) {
      return res.status(403).json({
        success: false,
        message: "Only teachers and admins can send messages",
      });
    }

    const { groupId, text } = req.body;
    const file = req.file;

    if (!text && !file) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    // Check group access
    const { group, error, status } = await verifyGroupAccess(
      groupId,
      schoolId,
      userId,
      userType,
    );

    if (error) {
      return res.status(status).json({ success: false, message: error });
    }

    let fileData = null;

    if (file) {
      const uploaded = await uploadToCloudinary(file, "messages");

      fileData = {
        url: uploaded.url,
        public_id: uploaded.public_id,
        type: uploaded.resource_type,
        name: file.originalname,
        size: file.size,
      };
    }

    const message = await Message.create({
      groupId,
      schoolId,
      sender: { userId, userType },
      text,
      file: fileData,
    });

    // Update group activity
    await Group.findByIdAndUpdate(groupId, {
      updatedAt: new Date(),
      lastMessage: text || "📎 Attachment",
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /messages/group/:groupId
 * Query: page, limit
 */
export const getGroupMessages = async (req, res) => {
  try {
    const { userId, userType, schoolId } = normalizeUser(req.user);
    const { groupId } = req.params;

    let { page = 1, limit = 20 } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, parseInt(limit));

    const { error, status } = await verifyGroupAccess(
      groupId,
      schoolId,
      userId,
      userType,
    );

    if (error) {
      return res.status(status).json({ success: false, message: error });
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({
        groupId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Message.countDocuments({
        groupId,
        isDeleted: false,
      }),
    ]);

    res.json({
      success: true,
      data: messages.reverse(), // show oldest first
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /messages/:id
 */
export const updateMessage = async (req, res) => {
  try {
    const { userId } = normalizeUser(req.user);
    const { text } = req.body;

    const message = await Message.findById(req.params.id);

    if (!message || message.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.file) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit file messages",
      });
    }

    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message text cannot be empty",
      });
    }

    if (message.sender.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not your message",
      });
    }

    message.text = text;
    await message.save();

    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /messages/:id  — soft delete
 */
export const deleteMessage = async (req, res) => {
  try {
    const { userId, userType } = normalizeUser(req.user);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    const message = await Message.findById(id);

    if (!message || message.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const isOwner = message.sender.userId.toString() === userId.toString();

    if (!isOwner && userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    // delete file from cloudinary
    if (message.file?.public_id) {
      await deleteFromCloudinary(message.file.public_id);
    }

    message.isDeleted = true;
    await message.save();

    res.json({
      success: true,
      message: "Message deleted",
    });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /messages/:id/seen  — mark as seen
 */
export const markAsSeen = async (req, res) => {
  try {
    const { userId } = normalizeUser(req.user);
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const alreadySeen = message.seenBy.some(
      (u) => u.userId.toString() === userId.toString(),
    );

    if (!alreadySeen) {
      message.seenBy.push({ userId, seenAt: new Date() });
      message.status = "seen";
      await message.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Seen error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /messages/:id/pin  — toggle pin (admin only)
 */
export const togglePin = async (req, res) => {
  try {
    const { userId, userType, schoolId } = normalizeUser(req.user);
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    // Only admin can pin
    if (userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin only",
      });
    }

    // Find message
    const message = await Message.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Verify group access
    const { error, status } = await verifyGroupAccess(
      message.groupId,
      schoolId,
      userId,
      userType,
    );

    if (error) {
      return res.status(status).json({
        success: false,
        message: error,
      });
    }

    // If pinning → unpin others in same group
    if (!message.isPinned) {
      await Message.updateMany(
        {
          groupId: message.groupId,
          isPinned: true,
          isDeleted: false,
        },
        { $set: { isPinned: false } },
      );
    }

    // Toggle pin
    message.isPinned = !message.isPinned;
    await message.save();

    res.json({
      success: true,
      isPinned: message.isPinned,
    });
  } catch (err) {
    console.error("Toggle pin error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
