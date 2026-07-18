import bcrypt from "bcryptjs";
import School from "../models/school.js";
import Subscription from "../models/subscription.js";
import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import Section from "../models/section.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Timetable from "../models/timetable.js";
import Term from "../models/Term.js";
import Chapter from "../models/chapter.js";
import Topic from "../models/topic.js";
import Lead from "../models/lead.js";
import { MODULE_KEYS } from "../constants/module.js";

const DEFAULT_TEACHER_PASSWORD = "#teacher@school123";
const DEFAULT_STAFF_PASSWORD = "#staff@school123";

const SAMPLE_SCHOOLS = [
  {
    school_name: "Default School",
    slug: "default-school",
    admin_name: "School Admin",
    admin_email: "school@admin.com",
    admin_password: "#admin@school123",
    classes: [
      { name: "Test Class", section: "A", roomNumber: "101" },
      { name: "Grade 5", section: "B", roomNumber: "102" },
    ],
    teachers: [
      { fullName: "Teacher Admin", email: "teacher@admin.com", designation: "Lead Teacher", department: "Primary" },
      { fullName: "Ritika Sharma", email: "ritika.sharma@default.com", designation: "Science Teacher", department: "Primary" },
      { fullName: "Manav Khanna", email: "manav.khanna@default.com", designation: "English Teacher", department: "Primary" },
    ],
    staff: [
      { fullName: "Admin Coordinator", email: "staff.admin@default.com", staffRole: "administrator", adminGroup: true },
      { fullName: "Reception Desk", email: "reception@default.com", staffRole: "receptionist", adminGroup: true },
      { fullName: "Library Staff", email: "library@default.com", staffRole: "librarian", adminGroup: false },
      { fullName: "Accounts Staff", email: "accounts@default.com", staffRole: "accountant", adminGroup: false },
    ],
    subjects: ["Mathematics", "Science", "English", "EVS"],
    leads: [
      { studentName: "Dev Malhotra", parentName: "Sonia Malhotra", parentMobile: "9876500000", parentEmail: "sonia.malhotra@example.com", previousSchoolName: "Little Flower School" },
      { studentName: "Kiara Shah", parentName: "Amit Shah", parentMobile: "9876500007", parentEmail: "amit.shah@example.com", previousSchoolName: "Happy Kids Academy" },
    ],
  },
  {
    school_name: "Greenfield Academy",
    slug: "greenfield-academy",
    admin_name: "Anita Sharma",
    admin_email: "greenfield@admin.com",
    admin_password: "#greenfield123",
    classes: [
      { name: "Grade 8", section: "A", roomNumber: "201" },
      { name: "Grade 9", section: "B", roomNumber: "202" },
    ],
    teachers: [
      { fullName: "Rohit Mehta", email: "rohit.mehta@greenfield.com", designation: "Math Teacher", department: "Academics" },
      { fullName: "Sneha Iyer", email: "sneha.iyer@greenfield.com", designation: "Science Teacher", department: "Academics" },
      { fullName: "Aditya Kapoor", email: "aditya.kapoor@greenfield.com", designation: "English Teacher", department: "Academics" },
    ],
    staff: [
      { fullName: "Priya Nair", email: "priya.nair@greenfield.com", staffRole: "administrator", adminGroup: true },
      { fullName: "Karan Sethi", email: "karan.sethi@greenfield.com", staffRole: "accountant", adminGroup: false },
      { fullName: "Maya Verma", email: "maya.verma@greenfield.com", staffRole: "librarian", adminGroup: false },
      { fullName: "Ishita Rao", email: "ishita.rao@greenfield.com", staffRole: "counselor", adminGroup: true },
    ],
    subjects: ["Mathematics", "Science", "English", "Social Studies"],
    leads: [
      { studentName: "Aarav Singh", parentName: "Nitin Singh", parentMobile: "9876500001", parentEmail: "nitin.singh@example.com", previousSchoolName: "Sunrise Public School" },
      { studentName: "Myra Joshi", parentName: "Ritu Joshi", parentMobile: "9876500002", parentEmail: "ritu.joshi@example.com", previousSchoolName: "St. Mary School" },
    ],
  },
  {
    school_name: "Riverdale Public School",
    slug: "riverdale-public-school",
    admin_name: "Vivek Malhotra",
    admin_email: "riverdale@admin.com",
    admin_password: "#riverdale123",
    classes: [
      { name: "Grade 6", section: "A", roomNumber: "301" },
      { name: "Grade 7", section: "B", roomNumber: "302" },
    ],
    teachers: [
      { fullName: "Neha Arora", email: "neha.arora@riverdale.com", designation: "Class Teacher", department: "Middle School" },
      { fullName: "Saurabh Jain", email: "saurabh.jain@riverdale.com", designation: "Math Teacher", department: "Middle School" },
      { fullName: "Pooja Dutta", email: "pooja.dutta@riverdale.com", designation: "Science Teacher", department: "Middle School" },
    ],
    staff: [
      { fullName: "Alok Ghosh", email: "alok.ghosh@riverdale.com", staffRole: "principal", adminGroup: true },
      { fullName: "Reema Das", email: "reema.das@riverdale.com", staffRole: "receptionist", adminGroup: true },
      { fullName: "Tarun Bedi", email: "tarun.bedi@riverdale.com", staffRole: "other", staffRoleCustom: "Transport Coordinator", adminGroup: false },
      { fullName: "Sonal Shah", email: "sonal.shah@riverdale.com", staffRole: "librarian", adminGroup: false },
    ],
    subjects: ["Mathematics", "Science", "English", "Computer Applications"],
    leads: [
      { studentName: "Kabir Anand", parentName: "Rakesh Anand", parentMobile: "9876500003", parentEmail: "rakesh.anand@example.com", previousSchoolName: "Bright Future School" },
      { studentName: "Sara Khan", parentName: "Farah Khan", parentMobile: "9876500004", parentEmail: "farah.khan@example.com", previousSchoolName: "Holy Child School" },
    ],
  },
  {
    school_name: "Sunrise International School",
    slug: "sunrise-international-school",
    admin_name: "Meenal Gupta",
    admin_email: "sunrise@admin.com",
    admin_password: "#sunrise123",
    classes: [
      { name: "Grade 10", section: "A", roomNumber: "401" },
      { name: "Grade 11", section: "B", roomNumber: "402" },
    ],
    teachers: [
      { fullName: "Harsh Bhatia", email: "harsh.bhatia@sunrise.com", designation: "Physics Teacher", department: "Senior School" },
      { fullName: "Divya Menon", email: "divya.menon@sunrise.com", designation: "Chemistry Teacher", department: "Senior School" },
      { fullName: "Aisha Fernandes", email: "aisha.fernandes@sunrise.com", designation: "Biology Teacher", department: "Senior School" },
    ],
    staff: [
      { fullName: "Rahul Prasad", email: "rahul.prasad@sunrise.com", staffRole: "administrator", adminGroup: true },
      { fullName: "Jaya Pillai", email: "jaya.pillai@sunrise.com", staffRole: "accountant", adminGroup: false },
      { fullName: "Nikhil Joseph", email: "nikhil.joseph@sunrise.com", staffRole: "other", staffRoleCustom: "Admissions Executive", adminGroup: true },
      { fullName: "Tanvi Kulkarni", email: "tanvi.kulkarni@sunrise.com", staffRole: "counselor", adminGroup: false },
    ],
    subjects: ["Physics", "Chemistry", "Biology", "English Core"],
    leads: [
      { studentName: "Vihaan Patel", parentName: "Kunal Patel", parentMobile: "9876500005", parentEmail: "kunal.patel@example.com", previousSchoolName: "National High School" },
      { studentName: "Anaya Roy", parentName: "Soma Roy", parentMobile: "9876500006", parentEmail: "soma.roy@example.com", previousSchoolName: "Cambridge School" },
    ],
  },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const periodConfigs = [
  { id: "p1", name: "Period 1", start: "08:00", end: "08:40" },
  { id: "p2", name: "Period 2", start: "08:45", end: "09:25" },
  { id: "p3", name: "Period 3", start: "09:35", end: "10:15" },
  { id: "lunch", name: "Lunch", start: "10:15", end: "10:45" },
  { id: "p4", name: "Period 4", start: "10:45", end: "11:25" },
  { id: "p5", name: "Period 5", start: "11:30", end: "12:10" },
];

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const ensureSubscription = async () => {
  return (
    (await Subscription.findOne({ slug: "default" })) ||
    (await Subscription.create({
      name: "Default",
      slug: "default",
      price: 0,
      currency: "USD",
      billing_cycle: "yearly",
      roles: [],
      status: "Active",
    }))
  );
};

const generateTeacherId = async (schoolId) => {
  const count = await Teacher.countDocuments({ schoolId });
  return `TCH${String(count + 1).padStart(4, "0")}`;
};

const generateStaffId = async (schoolId) => {
  const count = await Staff.countDocuments({ schoolId });
  return `STF${String(count + 1).padStart(3, "0")}`;
};

const hashPassword = (password) => bcrypt.hash(password, 10);

const upsertSchool = async (schoolConfig, subscriptionId) => {
  const hashedPassword = await hashPassword(schoolConfig.admin_password);
  const school = await School.findOneAndUpdate(
    { admin_email: schoolConfig.admin_email },
    {
      $set: {
        school_name: schoolConfig.school_name,
        slug: schoolConfig.slug,
        subscription_plan: subscriptionId,
        admin_name: schoolConfig.admin_name,
        admin_password: hashedPassword,
        temp_password: schoolConfig.admin_password,
        status: "Active",
        subscribed_modules: MODULE_KEYS,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return school;
};

const upsertTeachers = async (school, schoolConfig) => {
  const passwordHash = await hashPassword(DEFAULT_TEACHER_PASSWORD);
  const teachers = [];

  for (const [index, teacherConfig] of schoolConfig.teachers.entries()) {
    let teacher = await Teacher.findOne({ schoolId: school._id, email: teacherConfig.email });

    if (!teacher) {
      teacher = new Teacher({
        schoolId: school._id,
        teacherId: await generateTeacherId(school._id),
      });
    }

    teacher.fullName = teacherConfig.fullName;
    teacher.email = teacherConfig.email;
    teacher.username = teacherConfig.email;
    teacher.password = passwordHash;
    teacher.temp_password = DEFAULT_TEACHER_PASSWORD;
    teacher.role = "teacher_admin";
    teacher.designation = teacherConfig.designation;
    teacher.department = teacherConfig.department;
    teacher.employmentType = teacher.employmentType || "Full-Time";
    teacher.status = "Present";
    teacher.isAdminGroup = index === 0;

    await teacher.save();
    teachers.push(teacher);
  }

  return teachers;
};

const upsertStaff = async (school, schoolConfig) => {
  const passwordHash = await hashPassword(DEFAULT_STAFF_PASSWORD);
  const staffMembers = [];

  for (const staffConfig of schoolConfig.staff) {
    let staff = await Staff.findOne({ schoolId: school._id, email: staffConfig.email });

    if (!staff) {
      staff = new Staff({
        schoolId: school._id,
        staffId: await generateStaffId(school._id),
      });
    }

    staff.fullName = staffConfig.fullName;
    staff.email = staffConfig.email;
    staff.username = staffConfig.email;
    staff.password = passwordHash;
    staff.temp_password = DEFAULT_STAFF_PASSWORD;
    staff.staffRole = staffConfig.staffRole;
    staff.staffRoleCustom = staffConfig.staffRoleCustom || null;
    staff.permissions = MODULE_KEYS;
    staff.status = "Active";
    staff.isAdminGroup = Boolean(staffConfig.adminGroup);

    await staff.save();
    staffMembers.push(staff);
  }

  return staffMembers;
};

const upsertSections = async (school, schoolConfig) => {
  const sections = {};

  for (const classConfig of schoolConfig.classes) {
    if (!sections[classConfig.section]) {
      sections[classConfig.section] = await Section.findOneAndUpdate(
        { schoolId: school._id, name: classConfig.section },
        { $set: { status: "Active" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  return sections;
};

const upsertClasses = async (school, schoolConfig, sections, teachers) => {
  const classes = [];

  for (const [index, classConfig] of schoolConfig.classes.entries()) {
    const assignedTeacher = teachers[index % teachers.length];

    const classDoc = await Class.findOneAndUpdate(
      { schoolId: school._id, name: classConfig.name },
      {
        $set: {
          status: "Active",
          details: [
            {
              sectionId: sections[classConfig.section]._id,
              roomNumber: classConfig.roomNumber,
              teacherId: assignedTeacher._id,
              capacity: 40,
              studentCount: 0,
              subjectTeachers: [],
            },
          ],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    classes.push(classDoc);
  }

  return classes;
};

const upsertSubjects = async (school, schoolConfig) => {
  const subjects = [];

  for (const subjectName of schoolConfig.subjects) {
    const uniqueName = `${subjectName} - ${school.school_name}`;
    const subject = await Subject.findOneAndUpdate(
      { schoolId: school._id, name: uniqueName },
      { $set: { status: "Active" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    subjects.push(subject);
  }

  return subjects;
};

const syncTeacherAssignments = async (teachers, classes, subjects) => {
  for (const [index, teacher] of teachers.entries()) {
    teacher.assignedClasses = classes
      .filter((_, classIndex) => classIndex === index % classes.length)
      .map((classDoc) => classDoc._id);

    teacher.subjects = subjects
      .filter((_, subjectIndex) => subjectIndex % teachers.length === index)
      .map((subject) => subject._id);

    await teacher.save();
  }

  for (const [classIndex, classDoc] of classes.entries()) {
    classDoc.details = classDoc.details.map((detail, detailIndex) => ({
      ...detail.toObject(),
      subjectTeachers: subjects.slice(0, 3).map((subject, subjectIndex) => ({
        subjectId: subject._id,
        teacherId: teachers[(classIndex + subjectIndex + detailIndex) % teachers.length]._id,
      })),
    }));

    await classDoc.save();
  }
};

const upsertTerms = async (school) => {
  const termConfigs = [
    { name: "Term 1", order: 1, academicYear: "2026-27", startDate: new Date("2026-04-01"), endDate: new Date("2026-09-30") },
    { name: "Term 2", order: 2, academicYear: "2026-27", startDate: new Date("2026-10-01"), endDate: new Date("2027-03-31") },
  ];

  const terms = [];

  for (const config of termConfigs) {
    const term = await Term.findOneAndUpdate(
      { schoolId: school._id, academicYear: config.academicYear, name: config.name },
      { $set: config },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    terms.push(term);
  }

  return terms;
};

const upsertChaptersAndTopics = async (school, classes, subjects, terms) => {
  for (const classDoc of classes) {
    for (const subject of subjects.slice(0, 2)) {
      for (const [termIndex, term] of terms.entries()) {
        const chapter = await Chapter.findOneAndUpdate(
          {
            schoolId: school._id,
            classId: classDoc._id,
            subjectId: subject._id,
            termId: term._id,
            name: `${subject.name.split(" - ")[0]} Foundations ${termIndex + 1}`,
          },
          {
            $set: {
              description: `Core ${subject.name.split(" - ")[0].toLowerCase()} topics for ${classDoc.name}`,
              learningOutcomes: [
                `Understand the basics of ${subject.name.split(" - ")[0]}`,
                `Apply classroom concepts in assessments`,
              ],
              order: termIndex + 1,
              status: "active",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        for (const [topicIndex, topicName] of ["Introduction", "Practice Session"].entries()) {
          await Topic.findOneAndUpdate(
            {
              schoolId: school._id,
              chapterId: chapter._id,
              name: `${topicName} ${termIndex + 1}`,
            },
            {
              $set: {
                subjectId: subject._id,
                classId: classDoc._id,
                content: `${topicName} content for ${subject.name.split(" - ")[0]} in ${classDoc.name}`,
                order: topicIndex + 1,
                difficultyLevel: topicIndex === 0 ? "easy" : "medium",
                keywords: [subject.name.split(" - ")[0], classDoc.name, topicName],
                status: "active",
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        }
      }
    }
  }
};

const upsertTimetables = async (school, classes, subjects, teachers) => {
  for (const [classIndex, classDoc] of classes.entries()) {
    const detail = classDoc.details[0];

    const schedule = DAYS.map((day, dayIndex) => ({
      day,
      periods: [
        {
          periodId: "p1",
          subjectId: subjects[(classIndex + dayIndex) % subjects.length]._id,
          teacherId: teachers[(classIndex + dayIndex) % teachers.length]._id,
          type: "lecture",
          status: "normal",
          customName: "",
        },
        {
          periodId: "p2",
          subjectId: subjects[(classIndex + dayIndex + 1) % subjects.length]._id,
          teacherId: teachers[(classIndex + dayIndex + 1) % teachers.length]._id,
          type: "lecture",
          status: "normal",
          customName: "",
        },
        {
          periodId: "p3",
          subjectId: subjects[(classIndex + dayIndex + 2) % subjects.length]._id,
          teacherId: teachers[(classIndex + dayIndex + 2) % teachers.length]._id,
          type: "activity",
          status: "normal",
          customName: "Lab / Activity",
        },
        {
          periodId: "lunch",
          subjectId: null,
          teacherId: null,
          type: "lunch",
          status: "normal",
          customName: "Lunch Break",
        },
        {
          periodId: "p4",
          subjectId: subjects[(classIndex + dayIndex + 3) % subjects.length]._id,
          teacherId: teachers[(classIndex + dayIndex) % teachers.length]._id,
          type: "lecture",
          status: "normal",
          customName: "",
        },
        {
          periodId: "p5",
          subjectId: null,
          teacherId: null,
          type: "free",
          status: "normal",
          customName: "Reading / Club",
        },
      ],
    }));

    await Timetable.findOneAndUpdate(
      { schoolId: school._id, classId: classDoc._id, detailId: detail._id },
      {
        $set: {
          periodConfigs,
          schedule,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
};

const upsertLeads = async (school, schoolConfig, teachers, staffMembers) => {
  const assignees = [
    {
      userId: school._id,
      userType: "school_admin",
      name: school.admin_name,
      roleLabel: "School Admin",
    },
    ...teachers
      .filter((teacher) => teacher.isAdminGroup)
      .map((teacher) => ({
        userId: teacher._id,
        userType: "teacher",
        name: teacher.fullName,
        roleLabel: "Teacher",
      })),
    ...staffMembers
      .filter((staff) => staff.isAdminGroup)
      .map((staff) => ({
        userId: staff._id,
        userType: "staff",
        name: staff.fullName,
        roleLabel: staff.staffRoleCustom || capitalize(staff.staffRole),
      })),
  ];

  for (const [index, leadConfig] of schoolConfig.leads.entries()) {
    const assignee = assignees[index % assignees.length];

    await Lead.findOneAndUpdate(
      { schoolId: school._id, studentName: leadConfig.studentName, parentMobile: leadConfig.parentMobile },
      {
        $set: {
          parentName: leadConfig.parentName,
          parentEmail: leadConfig.parentEmail,
          previousSchoolName: leadConfig.previousSchoolName,
          assignedTo: assignee,
          createdBy: school._id,
          status: index % 2 === 0 ? "New" : "Contacted",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
};

export const seedSampleData = async () => {
  const existingSchools = await School.countDocuments();
  if (existingSchools >= SAMPLE_SCHOOLS.length) {
    return;
  }

  const subscription = await ensureSubscription();

  for (const schoolConfig of SAMPLE_SCHOOLS) {
    const school = await upsertSchool(schoolConfig, subscription._id);
    const teachers = await upsertTeachers(school, schoolConfig);
    const staffMembers = await upsertStaff(school, schoolConfig);
    const sections = await upsertSections(school, schoolConfig);
    const classes = await upsertClasses(school, schoolConfig, sections, teachers);
    const subjects = await upsertSubjects(school, schoolConfig);
    await syncTeacherAssignments(teachers, classes, subjects);
    const terms = await upsertTerms(school);
    await upsertChaptersAndTopics(school, classes, subjects, terms);
    await upsertTimetables(school, classes, subjects, teachers);
    await upsertLeads(school, schoolConfig, teachers, staffMembers);
  }

  console.log("Sample data seeded: schools, staff, teachers, classes, subjects, timetables, leads, and syllabus.");
};