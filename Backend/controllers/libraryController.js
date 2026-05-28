import mongoose from "mongoose";
import Issue from "../models/issueschema.js";
import Book from "../models/bookschema.js";
import Student from "../models/student.js";
import { createNotificationHelper } from "./notificationController.js";
const FINE_PER_DAY = 10;

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const isOverdue = (issue) =>
  !issue.returnDate && new Date(issue.dueDate) < new Date();

const calculateFine = (dueDate, returnDate = new Date()) => {
  const due = new Date(dueDate);
  const returnedOn = new Date(returnDate);

  if (returnedOn <= due) {
    return 0;
  }

  const diffInMs = returnedOn.setHours(0, 0, 0, 0) - due.setHours(0, 0, 0, 0);
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  return diffInDays * FINE_PER_DAY;
};

const serializeIssue = (issueDoc) => {
  const issue = issueDoc.toObject ? issueDoc.toObject() : issueDoc;
  const fineAmount =
    issue.status === "Returned"
      ? issue.fineAmount || 0
      : calculateFine(issue.dueDate, new Date());
  const currentStatus =
    issue.status === "Returned"
      ? "Returned"
      : isOverdue(issue)
        ? "Overdue"
        : "Issued";

  return {
    ...issue,
    status: currentStatus,
    fineAmount,
    outstandingFine: Math.max(fineAmount - (issue.finePaid || 0), 0),
  };
};

const buildIssueFilters = ({ schoolId, status, search }) => {
  const matchStage = {
    schoolId: toObjectId(schoolId),
  };

  if (status === "active") {
    matchStage.returnDate = null;
  } else if (status === "returned") {
    matchStage.status = "Returned";
  } else if (status === "overdue") {
    matchStage.returnDate = null;
    matchStage.dueDate = { $lt: new Date() };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "students",
        localField: "studentId",
        foreignField: "_id",
        as: "studentId",
      },
    },
    {
      $unwind: {
        path: "$studentId",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "classes",
        localField: "studentId.classId",
        foreignField: "_id",
        as: "classDoc",
      },
    },
    {
      $lookup: {
        from: "sections",
        localField: "studentId.sectionId",
        foreignField: "_id",
        as: "sectionDoc",
      },
    },
    {
      $lookup: {
        from: "books",
        localField: "bookId",
        foreignField: "_id",
        as: "bookId",
      },
    },
    {
      $unwind: {
        path: "$bookId",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        "studentId.classId": { $arrayElemAt: ["$classDoc", 0] },
        "studentId.sectionId": { $arrayElemAt: ["$sectionDoc", 0] },
      },
    },
    {
      $project: {
        classDoc: 0,
        sectionDoc: 0,
      },
    },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "bookId.title": { $regex: search, $options: "i" } },
          { "bookId.author": { $regex: search, $options: "i" } },
          { "bookId.isbn": { $regex: search, $options: "i" } },
          { "studentId.firstName": { $regex: search, $options: "i" } },
          { "studentId.lastName": { $regex: search, $options: "i" } },
          { "studentId.studentId": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  pipeline.push({ $sort: { createdAt: -1 } });

  return pipeline;
};

export const addBook = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { title, author, isbn, totalCopies, category } = req.body;

    if (!schoolId || !title || !author || !isbn || !category) {
      return res.status(400).json({ error: "schoolId, title, author, isbn and category are required" });
    }

    const normalizedIsbn = String(isbn).trim();
    const copies = Math.max(Number(totalCopies) || 1, 1);

    const existingBook = await Book.findOne({ schoolId, isbn: normalizedIsbn });
    if (existingBook) {
      return res.status(400).json({ error: "Book with this ISBN already exists in this school" });
    }

  
    const book = await Book.create({
      schoolId,
      title: String(title).trim(),
      author: String(author).trim(),
      isbn: normalizedIsbn,
      category: String(category).trim(),
      totalCopies: copies,
      availableCopies: copies,
    });

       const notification =  await createNotificationHelper({
  title: `📚 Book added: ${title}`,
  message: `"${title}" has been added to the library.`,
  notificationType: "general",
  targetType: "all",
  schoolId,
  createdBy: req.user._id,
});



    res.status(201).json({
      success: true,
      message: "Book added successfully",
      data: book,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBooks = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { search = "" } = req.query;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    const query = { schoolId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const books = await Book.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: books,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBook = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { title, author, isbn, totalCopies, category } = req.body;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    const book = await Book.findOne({ _id: req.params.id, schoolId });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const issuedCopies = Math.max(book.totalCopies - book.availableCopies, 0);
    const nextTotalCopies = Math.max(Number(totalCopies) || book.totalCopies, 1);

    if (nextTotalCopies < issuedCopies) {
      return res.status(400).json({
        error: `Cannot reduce stock below ${issuedCopies} because those copies are currently issued`,
      });
    }

    const normalizedIsbn = String(isbn || book.isbn).trim();
    const duplicateBook = await Book.findOne({
      _id: { $ne: book._id },
      schoolId,
      isbn: normalizedIsbn,
    });

    if (duplicateBook) {
      return res.status(400).json({ error: "Another book with this ISBN already exists in this school" });
    }

    book.title = String(title || book.title).trim();
    book.author = String(author || book.author).trim();
    book.category = String(category || book.category).trim();
    book.isbn = normalizedIsbn;
    book.totalCopies = nextTotalCopies;
    book.availableCopies = nextTotalCopies - issuedCopies;

    await book.save();

    res.json({
      success: true,
      message: "Book updated successfully",
      data: book,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBook = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    const book = await Book.findOne({ _id: req.params.id, schoolId });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const activeIssue = await Issue.findOne({
      schoolId,
      bookId: book._id,
      returnDate: null,
    });

    if (activeIssue) {
      return res.status(400).json({
        error: "This book has active issue records. Return all copies before deleting it.",
      });
    }

    await Issue.deleteMany({ schoolId, bookId: book._id });
    await book.deleteOne();

    res.json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const issueBook = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { bookId, studentId, dueDate } = req.body;

    if (!schoolId || !bookId || !studentId || !dueDate) {
      return res.status(400).json({ error: "schoolId, bookId, studentId and dueDate are required" });
    }

    const [book, student, activeIssue] = await Promise.all([
      Book.findOne({ _id: bookId, schoolId }),
      Student.findOne({ _id: studentId, schoolId }),
      Issue.findOne({ schoolId, bookId, studentId, returnDate: null }),
    ]);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (book.availableCopies < 1) {
      return res.status(400).json({ error: "No copies are available for issue" });
    }

    if (activeIssue) {
      return res.status(400).json({ error: "This student already has an active issue for the selected book" });
    }

    const parsedDueDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDueDate.setHours(0, 0, 0, 0);

    if (Number.isNaN(parsedDueDate.getTime()) || parsedDueDate < today) {
      return res.status(400).json({ error: "Due date must be today or a future date" });
    }

    const issue = await Issue.create({
      schoolId,
      bookId,
      studentId,
      dueDate: parsedDueDate,
      status: "Issued",
    });

    book.availableCopies -= 1;
    await book.save();


    const populatedIssue = await Issue.findById(issue._id)
      .populate({
        path: "studentId",
        select: "firstName lastName studentId classId sectionId",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
        ],
      })
      .populate("bookId", "title author isbn category");

  const notification =  await createNotificationHelper({
  title: `📚 Book Issued: ${book.title}`,
  message: `"${book.title}" has been issued to ${populatedIssue.studentId.firstName}. Please return it by ${parsedDueDate.toLocaleDateString("en-IN")}.`,
  notificationType: "general",
    targets: [
    { type: 'student',   studentId: populatedIssue.studentId._id },
  ],
  schoolId,
  createdBy: req.user._id,
});


    res.status(201).json({
      success: true,
      message: "Book issued successfully",
      data: serializeIssue(populatedIssue),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const returnBook = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const issueId = req.params.issueId || req.body.issueId;
    const { finePaid } = req.body;

    if (!schoolId || !issueId) {
      return res.status(400).json({ error: "schoolId and issueId are required" });
    }

    const issue = await Issue.findOne({ _id: issueId, schoolId }).populate("bookId");
  
    if (!issue) {
      return res.status(404).json({ error: "Issue record not found" });
    }

    if (issue.returnDate) {
      return res.status(400).json({ error: "Book has already been returned" });
    }

    const returnedOn = new Date();
    const fineAmount = calculateFine(issue.dueDate, returnedOn);
    const safeFinePaid = Math.max(Number(finePaid) || 0, 0);

    issue.returnDate = returnedOn;
    issue.status = "Returned";
    issue.fineAmount = fineAmount;
    issue.finePaid = Math.min(safeFinePaid, fineAmount);
    await issue.save();

    await Book.updateOne(
      { _id: issue.bookId._id, schoolId },
      { $inc: { availableCopies: 1 } },
    );
    const populatedIssue = await Issue.findById(issue._id)
      .populate({
        path: "studentId",
        select: "firstName lastName studentId classId sectionId",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
        ],
      })
      .populate("bookId", "title author isbn category");
      
       const notification =  await createNotificationHelper({
  title: `📚 Book returned: ${issue.bookId.title}`,
  message: `"${issue.bookId.title}" has been returned by ${populatedIssue.studentId.firstName} ${populatedIssue.studentId.lastName}.`,
  notificationType: "general",
  targets: [
    { type: 'student', studentId: populatedIssue.studentId._id }
  ],
  schoolId,
  createdBy: req.user._id,
});

    res.json({
      success: true,
      message: "Book returned successfully",
      data: serializeIssue(populatedIssue),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getIssueBooks = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { search = "", status = "all" } = req.query;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    const issueDocs = await Issue.aggregate(buildIssueFilters({ schoolId, status, search }));
    const allIssueBooks = issueDocs.map(serializeIssue);

    const summary = {
      totalIssued: allIssueBooks.filter((issue) => issue.status !== "Returned").length,
      overdue: allIssueBooks.filter((issue) => issue.status === "Overdue").length,
      returned: allIssueBooks.filter((issue) => issue.status === "Returned").length,
      pendingFine: allIssueBooks.reduce(
        (sum, issue) => sum + (issue.status === "Returned" ? issue.outstandingFine : issue.fineAmount),
        0,
      ),
    };

    res.json({
      success: true,
      message: "Issue records fetched successfully",
      allissuebook: allIssueBooks,
      summary,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SUPER ADMIN FUNCTION
export const getAdminBooks = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;
    const { search = "" } = req.query;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    const query = { schoolId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const books = await Book.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: books,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAdminBookIssues = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;
    
    const { search = "", status = "all" } = req.query;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    const issueDocs = await Issue.aggregate(buildIssueFilters({ schoolId, status, search }));
    const allIssueBooks = issueDocs.map(serializeIssue);

    const summary = {
      totalIssued: allIssueBooks.filter((issue) => issue.status !== "Returned").length,
      overdue: allIssueBooks.filter((issue) => issue.status === "Overdue").length,
      returned: allIssueBooks.filter((issue) => issue.status === "Returned").length,
      pendingFine: allIssueBooks.reduce(
        (sum, issue) => sum + (issue.status === "Returned" ? issue.outstandingFine : issue.fineAmount),
        0,
      ),
    };

    res.json({
      success: true,
      message: "Issue records fetched successfully",
      allissuebook: allIssueBooks,
      summary,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStudentIssuesBooks = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const studentId = req.user?.student_id;
    const { status = "active" } = req.query;

    if (!schoolId || !studentId) {
      return res.status(400).json({ error: "schoolId and studentId are required" });
    }

    const issueDocs = await Issue.find({
      schoolId,
      studentId,
      ...(status === "active"
        ? { returnDate: null 
        }        : status === "returned"
          ? { status: "Returned" }
          : {}),
    })
      .populate({ path: "bookId", select: "title author isbn category" })
      .populate({
        path: "studentId",
        select: "name admissionNumber",
      });
   
    const myIssues = issueDocs.map(serializeIssue);
    res.json({
      success: true,
      message: "Your issue records fetched successfully",
      myIssues,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}