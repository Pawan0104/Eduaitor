/**
 * Global textbook catalog for Super Admin syllabus import.
 * NCERT titles follow commonly prescribed textbooks (English medium).
 * CBSE uses the same NCERT-prescribed set.
 * RBSE mirrors core subjects with board-labelled titles + Rajasthan-focused books.
 *
 * Format: { className, subjectName, title, medium? }
 */

const book = (className, subjectName, title, medium = "English") => ({
  className: String(className),
  subjectName,
  title,
  medium,
});

/* ─── NCERT (also used as CBSE base) ───────────────────────── */
export const NCERT_BOOKS = [
  // Class 1
  book(1, "Hindi", "Rimjhim Bhag 1"),
  book(1, "English", "Marigold"),
  book(1, "English", "Raindrops"),
  book(1, "Mathematics", "Math-Magic"),
  book(1, "Mathematics", "Joyful Mathematics"),
  book(1, "English", "Mridang"),
  book(1, "Hindi", "Sarangi"),

  // Class 2
  book(2, "Hindi", "Rimjhim Bhag 2"),
  book(2, "English", "Marigold"),
  book(2, "English", "Raindrops"),
  book(2, "Mathematics", "Math-Magic"),
  book(2, "Mathematics", "Joyful Mathematics"),
  book(2, "English", "Mridang"),
  book(2, "Hindi", "Sarangi"),

  // Class 3
  book(3, "Hindi", "Rimjhim Bhag 3"),
  book(3, "English", "Marigold"),
  book(3, "Mathematics", "Math-Magic"),
  book(3, "EVS", "Looking Around"),
  book(3, "English", "Mridang"),
  book(3, "Hindi", "Sarangi"),
  book(3, "Mathematics", "Joyful Mathematics"),

  // Class 4
  book(4, "Hindi", "Rimjhim Bhag 4"),
  book(4, "English", "Marigold"),
  book(4, "Mathematics", "Math-Magic"),
  book(4, "EVS", "Looking Around"),
  book(4, "English", "Mridang"),
  book(4, "Hindi", "Sarangi"),
  book(4, "Mathematics", "Joyful Mathematics"),

  // Class 5
  book(5, "Hindi", "Rimjhim Bhag 5"),
  book(5, "English", "Marigold"),
  book(5, "Mathematics", "Math-Magic"),
  book(5, "EVS", "Looking Around"),
  book(5, "English", "Mridang"),
  book(5, "Hindi", "Sarangi"),
  book(5, "Mathematics", "Joyful Mathematics"),

  // Class 6
  book(6, "Mathematics", "Mathematics"),
  book(6, "Mathematics", "Ganita Prakash"),
  book(6, "Science", "Science"),
  book(6, "Science", "Curiosity"),
  book(6, "English", "Honeysuckle"),
  book(6, "English", "A Pact with the Sun"),
  book(6, "Hindi", "Vasant Bhag 1"),
  book(6, "Hindi", "Bal Ram Katha"),
  book(6, "Hindi", "Durva Bhag 1"),
  book(6, "Social Science", "Our Pasts - I (History)"),
  book(6, "Social Science", "The Earth Our Habitat (Geography)"),
  book(6, "Social Science", "Social and Political Life - I"),
  book(6, "Sanskrit", "Ruchira Prathamo Bhag"),
  book(6, "Urdu", "Apni Zaban"),
  book(6, "Health & Physical Education", "Health and Physical Education"),

  // Class 7
  book(7, "Mathematics", "Mathematics"),
  book(7, "Mathematics", "Ganita Prakash"),
  book(7, "Science", "Science"),
  book(7, "Science", "Curiosity"),
  book(7, "English", "Honeycomb"),
  book(7, "English", "An Alien Hand"),
  book(7, "Hindi", "Vasant Bhag 2"),
  book(7, "Hindi", "Mahabharat"),
  book(7, "Hindi", "Durva Bhag 2"),
  book(7, "Social Science", "Our Pasts - II (History)"),
  book(7, "Social Science", "Our Environment (Geography)"),
  book(7, "Social Science", "Social and Political Life - II"),
  book(7, "Sanskrit", "Ruchira Dwitiya Bhag"),
  book(7, "Urdu", "Apni Zaban"),
  book(7, "Health & Physical Education", "Health and Physical Education"),

  // Class 8
  book(8, "Mathematics", "Mathematics"),
  book(8, "Mathematics", "Ganita Prakash"),
  book(8, "Science", "Science"),
  book(8, "Science", "Curiosity"),
  book(8, "English", "Honeydew"),
  book(8, "English", "It So Happened"),
  book(8, "Hindi", "Vasant Bhag 3"),
  book(8, "Hindi", "Bharat Ki Khoj"),
  book(8, "Hindi", "Durva Bhag 3"),
  book(8, "Social Science", "Our Pasts - III (History)"),
  book(8, "Social Science", "Resource and Development (Geography)"),
  book(8, "Social Science", "Social and Political Life - III"),
  book(8, "Sanskrit", "Ruchira Tritiya Bhag"),
  book(8, "Urdu", "Apni Zaban"),
  book(8, "Health & Physical Education", "Health and Physical Education"),

  // Class 9
  book(9, "Mathematics", "Mathematics"),
  book(9, "Science", "Science"),
  book(9, "English", "Beehive"),
  book(9, "English", "Moments (Supplementary)"),
  book(9, "English", "Words and Expressions - I"),
  book(9, "Hindi", "Kshitij Bhag 1"),
  book(9, "Hindi", "Kritika Bhag 1"),
  book(9, "Hindi", "Sparsh Bhag 1"),
  book(9, "Hindi", "Sanchayan Bhag 1"),
  book(9, "Social Science", "India and the Contemporary World - I (History)"),
  book(9, "Social Science", "Contemporary India - I (Geography)"),
  book(9, "Social Science", "Democratic Politics - I"),
  book(9, "Social Science", "Economics"),
  book(9, "Sanskrit", "Shemushi Prathamo Bhag"),
  book(9, "Sanskrit", "Vyakaranavithi"),
  book(9, "Information Technology", "Information and Communication Technology"),
  book(9, "Health & Physical Education", "Health and Physical Education"),

  // Class 10
  book(10, "Mathematics", "Mathematics"),
  book(10, "Science", "Science"),
  book(10, "English", "First Flight"),
  book(10, "English", "Footprints Without Feet (Supplementary)"),
  book(10, "English", "Words and Expressions - II"),
  book(10, "Hindi", "Kshitij Bhag 2"),
  book(10, "Hindi", "Kritika Bhag 2"),
  book(10, "Hindi", "Sparsh Bhag 2"),
  book(10, "Hindi", "Sanchayan Bhag 2"),
  book(10, "Social Science", "India and the Contemporary World - II (History)"),
  book(10, "Social Science", "Contemporary India - II (Geography)"),
  book(10, "Social Science", "Democratic Politics - II"),
  book(10, "Social Science", "Understanding Economic Development"),
  book(10, "Sanskrit", "Shemushi Dwitiya Bhag"),
  book(10, "Sanskrit", "Vyakaranavithi"),
  book(10, "Information Technology", "Information Technology"),
  book(10, "Health & Physical Education", "Health and Physical Education"),

  // Class 11
  book(11, "Mathematics", "Mathematics"),
  book(11, "Physics", "Physics Part I"),
  book(11, "Physics", "Physics Part II"),
  book(11, "Chemistry", "Chemistry Part I"),
  book(11, "Chemistry", "Chemistry Part II"),
  book(11, "Biology", "Biology"),
  book(11, "English", "Hornbill"),
  book(11, "English", "Snapshots (Supplementary)"),
  book(11, "English", "Woven Words"),
  book(11, "Hindi", "Antra"),
  book(11, "Hindi", "Aroh Bhag 1"),
  book(11, "Hindi", "Vitan Bhag 1"),
  book(11, "Hindi", "Antral Bhag 1"),
  book(11, "Accountancy", "Financial Accounting Part I"),
  book(11, "Accountancy", "Accountancy Part II"),
  book(11, "Business Studies", "Business Studies"),
  book(11, "Economics", "Introductory Microeconomics"),
  book(11, "Economics", "Statistics for Economics"),
  book(11, "History", "Themes in World History"),
  book(11, "Geography", "Fundamentals of Physical Geography"),
  book(11, "Geography", "India - Physical Environment"),
  book(11, "Geography", "Practical Work in Geography Part I"),
  book(11, "Political Science", "Indian Constitution at Work"),
  book(11, "Political Science", "Political Theory"),
  book(11, "Sociology", "Introducing Sociology"),
  book(11, "Sociology", "Understanding Society"),
  book(11, "Psychology", "Introduction to Psychology"),
  book(11, "Computer Science", "Computer Science"),
  book(11, "Informatics Practices", "Informatics Practices"),
  book(11, "Home Science", "Human Ecology and Family Sciences Part I"),
  book(11, "Home Science", "Human Ecology and Family Sciences Part II"),
  book(11, "Fine Arts", "An Introduction to Indian Art Part I"),
  book(11, "Physical Education", "Physical Education"),
  book(11, "Sanskrit", "Bhaswati"),
  book(11, "Sanskrit", "Shashwati"),
  book(11, "Biotechnology", "Biotechnology"),
  book(11, "Entrepreneurship", "Entrepreneurship"),

  // Class 12
  book(12, "Mathematics", "Mathematics Part I"),
  book(12, "Mathematics", "Mathematics Part II"),
  book(12, "Physics", "Physics Part I"),
  book(12, "Physics", "Physics Part II"),
  book(12, "Chemistry", "Chemistry Part I"),
  book(12, "Chemistry", "Chemistry Part II"),
  book(12, "Biology", "Biology"),
  book(12, "English", "Flamingo"),
  book(12, "English", "Vistas (Supplementary)"),
  book(12, "English", "Kaleidoscope"),
  book(12, "Hindi", "Antra"),
  book(12, "Hindi", "Aroh Bhag 2"),
  book(12, "Hindi", "Vitan Bhag 2"),
  book(12, "Hindi", "Antral Bhag 2"),
  book(12, "Accountancy", "Accountancy Part I - Not-for-Profit Organisation and Partnership Accounts"),
  book(12, "Accountancy", "Accountancy Part II - Company Accounts and Analysis of Financial Statements"),
  book(12, "Business Studies", "Business Studies Part I - Principles and Functions of Management"),
  book(12, "Business Studies", "Business Studies Part II - Business Finance and Marketing"),
  book(12, "Economics", "Introductory Microeconomics"),
  book(12, "Economics", "Introductory Macroeconomics"),
  book(12, "History", "Themes in Indian History Part I"),
  book(12, "History", "Themes in Indian History Part II"),
  book(12, "History", "Themes in Indian History Part III"),
  book(12, "Geography", "Fundamentals of Human Geography"),
  book(12, "Geography", "India - People and Economy"),
  book(12, "Geography", "Practical Work in Geography Part II"),
  book(12, "Political Science", "Contemporary World Politics"),
  book(12, "Political Science", "Politics in India Since Independence"),
  book(12, "Sociology", "Indian Society"),
  book(12, "Sociology", "Social Change and Development in India"),
  book(12, "Psychology", "Psychology"),
  book(12, "Computer Science", "Computer Science"),
  book(12, "Informatics Practices", "Informatics Practices"),
  book(12, "Home Science", "Human Ecology and Family Sciences Part I"),
  book(12, "Home Science", "Human Ecology and Family Sciences Part II"),
  book(12, "Fine Arts", "An Introduction to Indian Art Part II"),
  book(12, "Physical Education", "Physical Education"),
  book(12, "Sanskrit", "Bhaswati"),
  book(12, "Sanskrit", "Shashwati"),
  book(12, "Biotechnology", "Biotechnology"),
  book(12, "Entrepreneurship", "Entrepreneurship"),
];

/** CBSE schools use NCERT textbooks — same catalog, board = CBSE */
export const CBSE_BOOKS = NCERT_BOOKS.map((b) => ({
  ...b,
  title: b.title,
  description: `CBSE prescribed (NCERT) — ${b.title}`,
}));

/* ─── RBSE (Rajasthan Board) ───────────────────────────────── */
export const RBSE_BOOKS = [
  // Primary 1–5
  ...[1, 2, 3, 4, 5].flatMap((c) => [
    book(c, "Hindi", `Hindi Class ${c} (RBSE)`, "Hindi"),
    book(c, "English", `English Class ${c} (RBSE)`),
    book(c, "Mathematics", `Mathematics Class ${c} (RBSE)`),
    book(c, "Mathematics", `Ganit Class ${c} (RBSE)`, "Hindi"),
    ...(c >= 3
      ? [
          book(c, "EVS", `Environmental Studies Class ${c} (RBSE)`),
          book(c, "EVS", `Paryavaran Adhyayan Class ${c} (RBSE)`, "Hindi"),
        ]
      : []),
  ]),

  // Middle 6–8
  ...[6, 7, 8].flatMap((c) => [
    book(c, "Hindi", `Hindi Class ${c} (RBSE)`, "Hindi"),
    book(c, "English", `English Class ${c} (RBSE)`),
    book(c, "Mathematics", `Mathematics Class ${c} (RBSE)`),
    book(c, "Mathematics", `Ganit Class ${c} (RBSE)`, "Hindi"),
    book(c, "Science", `Science Class ${c} (RBSE)`),
    book(c, "Science", `Vigyan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Social Science", `Social Science Class ${c} (RBSE)`),
    book(c, "Social Science", `Samajik Vigyan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Sanskrit", `Sanskrit Class ${c} (RBSE)`, "Hindi"),
    book(c, "Computer", `Computer Class ${c} (RBSE)`),
    book(c, "Rajasthan Studies", `Rajasthan Adhyayan Class ${c} (RBSE)`, "Hindi"),
  ]),

  // Secondary 9–10
  ...[9, 10].flatMap((c) => [
    book(c, "Hindi", `Hindi Class ${c} (RBSE)`, "Hindi"),
    book(c, "English", `English Class ${c} (RBSE)`),
    book(c, "Mathematics", `Mathematics Class ${c} (RBSE)`),
    book(c, "Mathematics", `Ganit Class ${c} (RBSE)`, "Hindi"),
    book(c, "Science", `Science Class ${c} (RBSE)`),
    book(c, "Science", `Vigyan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Social Science", `Social Science Class ${c} (RBSE)`),
    book(c, "Social Science", `Samajik Vigyan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Sanskrit", `Sanskrit Class ${c} (RBSE)`, "Hindi"),
    book(c, "Computer", `Computer / IT Class ${c} (RBSE)`),
    book(c, "Rajasthan Studies", `Rajasthan Adhyayan Class ${c} (RBSE)`, "Hindi"),
  ]),

  // Senior secondary 11–12 — Science
  ...[11, 12].flatMap((c) => [
    book(c, "Physics", `Physics Class ${c} (RBSE)`),
    book(c, "Physics", `Bhautiki Class ${c} (RBSE)`, "Hindi"),
    book(c, "Chemistry", `Chemistry Class ${c} (RBSE)`),
    book(c, "Chemistry", `Rasayan Vigyan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Biology", `Biology Class ${c} (RBSE)`),
    book(c, "Biology", `Jeev Vigyan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Mathematics", `Mathematics Class ${c} (RBSE)`),
    book(c, "Mathematics", `Ganit Class ${c} (RBSE)`, "Hindi"),
    book(c, "English", `English Class ${c} (RBSE)`),
    book(c, "Hindi", `Hindi Class ${c} (RBSE)`, "Hindi"),
    book(c, "Computer Science", `Computer Science Class ${c} (RBSE)`),
    book(c, "Physical Education", `Physical Education Class ${c} (RBSE)`),
  ]),

  // Senior secondary 11–12 — Commerce
  ...[11, 12].flatMap((c) => [
    book(c, "Accountancy", `Accountancy Class ${c} (RBSE)`),
    book(c, "Accountancy", `Lekha Shastra Class ${c} (RBSE)`, "Hindi"),
    book(c, "Business Studies", `Business Studies Class ${c} (RBSE)`),
    book(c, "Business Studies", `Vyavasayik Adhyayan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Economics", `Economics Class ${c} (RBSE)`),
    book(c, "Economics", `Arthashastra Class ${c} (RBSE)`, "Hindi"),
  ]),

  // Senior secondary 11–12 — Arts / Humanities
  ...[11, 12].flatMap((c) => [
    book(c, "History", `History Class ${c} (RBSE)`),
    book(c, "History", `Itihas Class ${c} (RBSE)`, "Hindi"),
    book(c, "Geography", `Geography Class ${c} (RBSE)`),
    book(c, "Geography", `Bhugol Class ${c} (RBSE)`, "Hindi"),
    book(c, "Political Science", `Political Science Class ${c} (RBSE)`),
    book(c, "Political Science", `Rajneeti Vigyan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Sociology", `Sociology Class ${c} (RBSE)`),
    book(c, "Sociology", `Samajshastra Class ${c} (RBSE)`, "Hindi"),
    book(c, "Psychology", `Psychology Class ${c} (RBSE)`),
    book(c, "Psychology", `Manovigyan Class ${c} (RBSE)`, "Hindi"),
    book(c, "Home Science", `Home Science Class ${c} (RBSE)`),
    book(c, "Philosophy", `Philosophy Class ${c} (RBSE)`),
    book(c, "Public Administration", `Public Administration Class ${c} (RBSE)`),
    book(c, "Sanskrit", `Sanskrit Class ${c} (RBSE)`, "Hindi"),
    book(c, "Rajasthan Studies", `Rajasthan History & Culture Class ${c} (RBSE)`, "Hindi"),
  ]),
];

/** Optional sample chapters for a few popular books (keyed by exact title) */
export const SAMPLE_CHAPTERS = {
  Mathematics: [
    { name: "Chapter 1", topics: ["Introduction", "Exercise"] },
    { name: "Chapter 2", topics: ["Introduction", "Exercise"] },
  ],
  Science: [
    { name: "Chapter 1", topics: ["Introduction", "Activities"] },
    { name: "Chapter 2", topics: ["Introduction", "Activities"] },
  ],
  Honeysuckle: [
    {
      name: "Who Did Patrick's Homework?",
      topics: ["Reading", "Vocabulary", "Comprehension"],
    },
    {
      name: "How the Dog Found Himself a New Master!",
      topics: ["Reading", "Grammar Focus"],
    },
  ],
  "Mathematics Class 6": [
    {
      name: "Knowing Our Numbers",
      topics: ["Comparing Numbers", "Large Numbers", "Estimation"],
    },
    {
      name: "Whole Numbers",
      topics: ["Number Line", "Properties of Whole Numbers"],
    },
  ],
};
