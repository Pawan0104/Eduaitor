"""Generate Docs/Eduaitor_Login_Credentials.docx from the markdown source."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "Docs" / "Eduaitor_Login_Credentials.docx"

ACCENT = RGBColor(0x05, 0x96, 0x69)


def add_heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = ACCENT
    return h


def add_table(doc, headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Light Grid Accent 1"
    for cell, header in zip(table.rows[0].cells, headers):
        cell.text = header
        for para in cell.paragraphs:
            for run in para.runs:
                run.bold = True
    for row in rows:
        cells = table.add_row().cells
        for cell, value in zip(cells, row):
            cell.text = value
    doc.add_paragraph()
    return table


def add_code(doc, lines):
    for line in lines:
        para = doc.add_paragraph()
        run = para.add_run(line)
        run.font.name = "Consolas"
        run.font.size = Pt(9.5)


doc = Document()

title = doc.add_heading("Eduaitor — Login Credentials", level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta.add_run(
    "Default School · all modules unlocked\n"
    "Live: https://admineduaitor.netlify.app · Local: http://localhost:5173\n"
    "Login URL: /admin/login"
).italic = True

doc.add_paragraph(
    "Every role logs in from the same login page. The portal is chosen "
    "automatically from the account role."
)

add_heading(doc, "1. Primary roles", 1)
add_table(
    doc,
    ["#", "Role", "Username / Email", "Password", "Portal"],
    [
        ["1", "Super Admin", "super@admin.com", "Backend/.env → SUPER_ADMIN_PASSWORD", "/admin"],
        ["2", "School Admin", "school@admin.com", "#admin@school123", "/school"],
        ["3", "Teacher", "teacher@admin.com", "#teacher@school123", "/teacher"],
        ["4", "Student", "qa.student@default.com", "#qa@student123", "/student"],
        ["5", "Parent", "9876543299 (father mobile)", "#qa@parent123", "/parent"],
    ],
)

add_heading(doc, "2. Staff portals", 1)
doc.add_paragraph("All staff accounts use password #staff@school123 and land on /staff.")
add_table(
    doc,
    ["#", "Role", "Username / Email"],
    [
        ["6", "Accountant", "qa.accountant@default.com"],
        ["7", "Security Guard", "qa.guard@default.com"],
        ["8", "Hostel Warden", "qa.warden@default.com"],
        ["9", "Reception", "qa.reception@default.com"],
        ["10", "Librarian", "qa.library@default.com"],
    ],
)

add_heading(doc, "3. Multi-child parents (child switcher)", 1)
add_table(
    doc,
    ["Role", "Username", "Password", "Children"],
    [
        ["Parent — Ramesh Gupta", "9000001001", "#multi@parent123", "Arjun, Anvi, Kabir"],
        ["Parent — Suresh Patel", "9000002001", "#multi@parent123", "Ishaan, Diya"],
    ],
)
doc.add_paragraph("Per-child student logins (password #multi@student123):")
add_table(
    doc,
    ["Student", "Username"],
    [
        ["Arjun Gupta", "arjun.gupta@multi.test"],
        ["Anvi Gupta", "anvi.gupta@multi.test"],
        ["Kabir Gupta", "kabir.gupta@multi.test"],
        ["Ishaan Patel", "ishaan.patel@multi.test"],
        ["Diya Patel", "diya.patel@multi.test"],
    ],
)

add_heading(doc, "4. Legacy / alias accounts", 1)
add_table(
    doc,
    ["Role", "Username", "Password"],
    [
        ["Student (Disha Patni)", "student@admin.com", "#disha@patni123"],
        ["Accounts staff", "accounts@default.com", "#staff@school123"],
        ["Reception staff", "reception@default.com", "#staff@school123"],
    ],
)

add_heading(doc, "5. Demo teachers (optional seed)", 1)
doc.add_paragraph(
    "Seeded by node scripts/seedDemoDefaultSchool.js, password #demo@12345."
)
add_table(
    doc,
    ["Teacher", "Username"],
    [
        ["Priya Malhotra", "priya.malhotra@default.com"],
        ["Rahul Desai", "rahul.desai@default.com"],
        ["Meera Joshi", "meera.joshi@default.com"],
    ],
)

add_heading(doc, "6. No-login entities", 1)
add_table(
    doc,
    ["Entity", "Details"],
    [
        [
            "Driver",
            "No login portal. Managed from School / Staff → Transport. "
            "QA driver phone 9876500999",
        ]
    ],
)

add_heading(doc, "7. How to (re)seed accounts", 1)
add_code(
    doc,
    [
        "cd Backend",
        "node scripts/seedQaTestUsers.js        # core roles + legacy student",
        "node scripts/seedMultiChildParents.js  # multi-child parents",
        "node scripts/seedDemoDefaultSchool.js  # optional demo teachers",
    ],
)
doc.add_paragraph(
    "The Super Admin is not seeded — it is read from SUPER_ADMIN_EMAIL / "
    "SUPER_ADMIN_PASSWORD in Backend/.env."
)

add_heading(doc, "8. Verification status", 1)
doc.add_paragraph(
    "Last full pass: all accounts above verified at both the API layer "
    "(POST /api/auth/login) and through the browser login form, each landing "
    "on its correct role menu."
)

warning = doc.add_paragraph()
warning.add_run(
    "These are QA / non-production credentials. Rotate them before any public "
    "launch and never commit Backend/.env."
).bold = True

doc.save(OUT)
print(f"wrote {OUT}")
