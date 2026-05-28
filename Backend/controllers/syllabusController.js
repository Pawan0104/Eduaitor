// controllers/syllabusController.js
import Topic from "../models/topic.js";
import Chapter from "../models/chapter.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";

// ==================== CHAPTER CONTROLLERS ====================

export const createChapter = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { classId, subjectId, termId, name, description, learningOutcomes } =
      req.body;

    if (!schoolId || !classId || !subjectId || !name) {
      return res.status(400).json({
        success: false,
        message: "schoolId, classId, subjectId, and name are required",
      });
    }
    if (!termId) {
      return res.status(400).json({
        success: false,
        message: "termId is required",
      });
    }

    // Get max order for this subject
    const maxOrder = await Chapter.findOne(
      { schoolId, classId, subjectId, termId },
      { order: 1 },
    ).sort({ order: -1 });

    const newChapter = new Chapter({
      schoolId,
      classId,
      subjectId,
      name,
      termId,
      description: description || "",
      learningOutcomes: learningOutcomes || [],
      order: (maxOrder?.order || 0) + 1,
    });

    await newChapter.save();

    res.status(201).json({
      success: true,
      message: "Chapter created successfully",
      chapter: newChapter,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getChapters = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { classId, subjectId, termId } = req.query;

    if (!schoolId || !classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "schoolId, classId, and subjectId are required",
      });
    }
    if (!termId) {
      return res.status(400).json({
        success: false,
        message: "TermId is required",
      });
    }

    const chapters = await Chapter.find({
      schoolId,
      classId,
      subjectId,
      termId,
      status: "active",
    }).sort({ order: 1 });

    res.json({ success: true, chapters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { name, description, learningOutcomes, termId } = req.body;

    if (!chapterId) {
      return res.status(400).json({
        success: false,
        message: "chapterId is required",
      });
    }

    const chapter = await Chapter.findByIdAndUpdate(
      chapterId,
      {
        name,
        description,
        learningOutcomes,
        termId,
      },
      { new: true, runValidators: true },
    );

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Chapter not found",
      });
    }

    res.json({
      success: true,
      message: "Chapter updated successfully",
      chapter,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;

    if (!chapterId) {
      return res.status(400).json({
        success: false,
        message: "chapterId is required",
      });
    }

    // Delete chapter and all associated topics
    await Topic.deleteMany({ chapterId });
    await Chapter.findByIdAndDelete(chapterId);

    res.json({
      success: true,
      message: "Chapter deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reorderChapters = async (req, res) => {
  try {
    const { chapters } = req.body; // Array of {id, order}

    if (!Array.isArray(chapters)) {
      return res.status(400).json({
        success: false,
        message: "chapters should be an array",
      });
    }

    // Bulk update orders
    const updatePromises = chapters.map((ch) =>
      Chapter.findByIdAndUpdate(ch.id, { order: ch.order }),
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Chapters reordered successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== TOPIC CONTROLLERS ====================

export const createTopic = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const {
      chapterId,
      subjectId,
      classId,
      name,
      content,
      difficultyLevel,
      keywords,
    } = req.body;

    if (!schoolId || !chapterId || !subjectId || !classId || !name) {
      return res.status(400).json({
        success: false,
        message:
          "schoolId, chapterId, subjectId, classId, and name are required",
      });
    }

    // Get max order for this chapter
    const maxOrder = await Topic.findOne(
      { schoolId, chapterId },
      { order: 1 },
    ).sort({
      order: -1,
    });

    const newTopic = new Topic({
      schoolId,
      chapterId,
      subjectId,
      classId,
      name,
      content: content || "",
      difficultyLevel: difficultyLevel || "medium",
      keywords: keywords || [],
    });

    newTopic.order = (maxOrder?.order || 0) + 1;
    await newTopic.save();

    res.status(201).json({
      success: true,
      message: "Topic created successfully",
      topic: newTopic,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTopics = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { chapterId } = req.query;

    if (!schoolId || !chapterId) {
      return res.status(400).json({
        success: false,
        message: "schoolId and chapterId are required",
      });
    }

    const topics = await Topic.find({
      schoolId,
      chapterId,
      status: "active",
    }).sort({ order: 1 });

    res.json({ success: true, topics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { name, content, difficultyLevel, keywords } = req.body;

    if (!topicId) {
      return res.status(400).json({
        success: false,
        message: "topicId is required",
      });
    }

    const topic = await Topic.findByIdAndUpdate(
      topicId,
      {
        name,
        content,
        difficultyLevel,
        keywords,
      },
      { new: true, runValidators: true },
    );

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    res.json({
      success: true,
      message: "Topic updated successfully",
      topic,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    if (!topicId) {
      return res.status(400).json({
        success: false,
        message: "topicId is required",
      });
    }

    await Topic.findByIdAndDelete(topicId);

    res.json({
      success: true,
      message: "Topic deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reorderTopics = async (req, res) => {
  try {
    const { topics } = req.body; // Array of {id, order}

    if (!Array.isArray(topics)) {
      return res.status(400).json({
        success: false,
        message: "topics should be an array",
      });
    }

    const updatePromises = topics.map((t) =>
      Topic.findByIdAndUpdate(t.id, { order: t.order }),
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Topics reordered successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== BULK FETCH ====================

export const getSyllabusStructure = async (req, res) => {
  try {
    const { schoolId, classId, subjectId } = req.query;

    if (!schoolId || !classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "schoolId, classId, and subjectId are required",
      });
    }

    const chapters = await Chapter.find({
      schoolId,
      classId,
      subjectId,
      status: "active",
    }).sort({ order: 1 });

    const chapterIds = chapters.map((ch) => ch._id);
    const topics = await Topic.find({
      schoolId,
      chapterId: { $in: chapterIds },
      status: "active",
    }).sort({ chapterId: 1, order: 1 });

    // Structure data
    const structure = chapters.map((chapter) => ({
      ...chapter.toObject(),
      topics: topics.filter(
        (t) => t.chapterId.toString() === chapter._id.toString(),
      ),
    }));

    res.json({
      success: true,
      structure,
      totalChapters: chapters.length,
      totalTopics: topics.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// fetch all syllabus data for super admin
export const getCompleteSyllabus = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;

    const classes = await Class.find({ schoolId }).lean();

    const classesWithData = await Promise.all(
      classes.map(async (classItem) => {
        // Step 1: Get unique subject IDs for this class
        const subjectIds = [
          ...new Map(
            classItem.details
              .flatMap((section) =>
                section.subjectTeachers?.map((st) => st.subjectId),
              )
              .filter(Boolean)
              .map((id) => [id.toString(), id]),
          ).values(),
        ];

        // Step 2: Fetch subjects + chapters for this class in parallel
        const [subjects, allChapters] = await Promise.all([
          Subject.find({ _id: { $in: subjectIds } }).lean(),
          Chapter.find({
            classId: classItem._id, // ← scoped to this class
            subjectId: { $in: subjectIds },
          }).lean(),
        ]);

        // Step 3: Fetch all topics for those chapters in one query
        const chapterIds = allChapters.map((c) => c._id);
        const allTopics = await Topic.find({
          classId: classItem._id, // ← scoped to this class
          chapterId: { $in: chapterIds },
        }).lean();

        // Step 4: Group topics by chapterId in memory
        const topicsByChapter = allTopics.reduce((acc, topic) => {
          const key = topic.chapterId.toString();
          if (!acc[key]) acc[key] = [];
          acc[key].push(topic);
          return acc;
        }, {});

        // Step 5: Group chapters by subjectId in memory
        const chaptersBySubject = allChapters.reduce((acc, chapter) => {
          const key = chapter.subjectId.toString();
          const topics = topicsByChapter[chapter._id.toString()] || [];
          const chapterWithTopics = {
            ...chapter,
            topics,
            topicCount: topics.length,
          };
          if (!acc[key]) acc[key] = [];
          acc[key].push(chapterWithTopics);
          return acc;
        }, {});

        // Step 6: Attach chapters to each subject
        const subjectsWithData = subjects.map((subject) => {
          const chapters = chaptersBySubject[subject._id.toString()] || [];
          return {
            ...subject,
            chapters,
            chapterCount: chapters.length,
          };
        });

        return {
          ...classItem,
          subjects: subjectsWithData,
          subjectCount: subjects.length,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: { classes: classesWithData },
    });
  } catch (error) {
    console.error("Syllabus fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch syllabus",
      error: error.message,
    });
  }
};
