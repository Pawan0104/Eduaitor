import Term from "../models/Term.js";

// CREATE
export const createTerm = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { name, academicYear } = req.body;

    if (!schoolId || !name || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "schoolId, name and academicYear required",
      });
    }

    const term = new Term({
      schoolId,
      name,
      academicYear,
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
    const { academicYear } = req.query;

    const filter = { schoolId };
    if (academicYear) filter.academicYear = academicYear;

    const terms = await Term.find(filter).sort({ order: 1 });

    res.json({ success: true, terms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
export const updateTerm = async (req, res) => {
  try {
    const { termId } = req.params;
    const { name, academicYear } = req.body;

    const term = await Term.findByIdAndUpdate(
      termId,
      { name, academicYear },
      { new: true }
    );

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