import Term from "../models/Term.js";

const inferTermType = (name = "") => {
  const n = String(name).toLowerCase();
  if (n.includes("half")) return "half_yearly";
  if (n.includes("year") || n.includes("annual") || n.includes("final")) {
    return "yearly";
  }
  return "other";
};

// CREATE
export const createTerm = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { name, academicYear, termType, startDate, endDate, order } =
      req.body;

    if (!schoolId || !name || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "schoolId, name and academicYear required",
      });
    }

    let resolvedOrder = order;
    if (resolvedOrder === undefined || resolvedOrder === null || resolvedOrder === "") {
      const count = await Term.countDocuments({
        schoolId,
        academicYear: academicYear.trim(),
      });
      resolvedOrder = count + 1;
    }

    const term = new Term({
      schoolId,
      name: name.trim(),
      academicYear: academicYear.trim(),
      termType: termType || inferTermType(name),
      startDate: startDate || null,
      endDate: endDate || null,
      order: Number(resolvedOrder),
    });

    await term.save();

    res.status(201).json({
      success: true,
      term,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET ALL
export const getTerms = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { academicYear, termType } = req.query;

    const filter = { schoolId };
    if (academicYear) filter.academicYear = academicYear;
    if (termType) filter.termType = termType;

    let terms = await Term.find(filter).sort({ order: 1, createdAt: 1 });

    // Seed flexible Term 1 / Term 2 if school has none (schools can rename/add more)
    if (terms.length === 0 && !termType) {
      const year =
        academicYear ||
        `${new Date().getFullYear()}-${String(
          (new Date().getFullYear() + 1) % 100,
        ).padStart(2, "0")}`;
      await Term.insertMany([
        {
          schoolId,
          name: "Term 1",
          academicYear: year,
          termType: "other",
          order: 1,
        },
        {
          schoolId,
          name: "Term 2",
          academicYear: year,
          termType: "other",
          order: 2,
        },
      ]);
      terms = await Term.find({ schoolId, academicYear: year }).sort({
        order: 1,
      });
    }

    res.json({ success: true, terms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
export const updateTerm = async (req, res) => {
  try {
    const { termId } = req.params;
    const { name, academicYear, termType, startDate, endDate, order } =
      req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (academicYear !== undefined) update.academicYear = academicYear.trim();
    if (termType !== undefined) update.termType = termType;
    else if (name !== undefined) update.termType = inferTermType(name);
    if (startDate !== undefined) update.startDate = startDate || null;
    if (endDate !== undefined) update.endDate = endDate || null;
    if (order !== undefined) update.order = order;

    const term = await Term.findByIdAndUpdate(termId, update, { new: true });

    res.json({ success: true, term });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE
export const deleteTerm = async (req, res) => {
  try {
    const { termId } = req.params;

    await Term.findByIdAndDelete(termId);

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
