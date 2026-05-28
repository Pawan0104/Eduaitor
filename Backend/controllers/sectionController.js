import Section from "../models/section.js";

/* -------------------------------- CREATE SECTION ------------------------------- */

export const createSection = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    let { name, status } = req.body;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    name = name.trim();

    const existing = await Section.findOne({
      schoolId,
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existing)
      return res.status(400).json({
        success: false,
        message: "Section already exists",
      });

    const section = await Section.create({
      name,
      status,
      schoolId,
      subsections: [],
    });

    res.status(201).json({
      success: true,
      message: "Section created successfully",
      section,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- GET SECTIONS ------------------------------- */

export const getSections = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    const sections = await Section.find({ schoolId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      sections,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- UPDATE SECTION ------------------------------- */

export const updateSection = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { id } = req.params;
    let { name, status } = req.body;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    const section = await Section.findOne({ _id: id, schoolId });

    if (!section)
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });

    if (name) {
      name = name.trim();

      const existing = await Section.findOne({
        schoolId,
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (existing)
        return res.status(400).json({
          success: false,
          message: "Section name already exists",
        });
    }

    section.name = name || section.name;
    section.status = status || section.status;

    if (status === "Inactive") {
      section.subsections = section.subsections.map((sub) => ({
        ...sub.toObject(),
        status: "Inactive",
      }));
    }

    await section.save();

    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      section,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- DELETE SECTION ------------------------------- */

export const deleteSection = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    const section = await Section.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!section)
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });

    await section.deleteOne();

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- ADD SUBSECTION ------------------------------- */

export const addSubSection = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { sectionId } = req.params;
    const { name, status } = req.body;

    const section = await Section.findOne({
      _id: sectionId,
      schoolId,
    });

    if (!section)
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });

    const exists = section.subsections.find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );

    if (exists)
      return res.status(400).json({
        success: false,
        message: "Subsection already exists",
      });

    const subStatus = section.status === "Inactive" ? "Inactive" : status;

    section.subsections.push({ name, status: subStatus });

    await section.save();

    res.status(201).json({
      success: true,
      message: "Subsection added successfully",
      section,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- UPDATE SUBSECTION ------------------------------- */

export const updateSubSection = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { sectionId, subId } = req.params;
    const { name, status } = req.body;

    const section = await Section.findOne({
      _id: sectionId,
      schoolId,
    });

    if (!section)
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });

    const subsection = section.subsections.id(subId);

    if (!subsection)
      return res.status(404).json({
        success: false,
        message: "Subsection not found",
      });

    if (status === "Active" && section.status === "Inactive") {
      return res.status(400).json({
        success: false,
        message: "Activate section first",
      });
    }

    subsection.name = name;
    subsection.status = status;

    await section.save();

    res.status(200).json({
      success: true,
      message: "Subsection updated successfully",
      section,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- DELETE SUBSECTION ------------------------------- */

export const deleteSubSection = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { sectionId, subId } = req.params;

    const section = await Section.findOne({
      _id: sectionId,
      schoolId,
    });

    if (!section)
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });

    section.subsections.pull(subId);

    await section.save();

    res.status(200).json({
      success: true,
      message: "Subsection deleted successfully",
      section,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- GET ALL SECTIONS (SUPER ADMIN) ------------------------------- */
export const getAllSections = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    const sections = await Section.find({ schoolId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      sections,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
