import XLSX from "xlsx";

const file = "C:/Users/pawan/OneDrive/Desktop/Student Report.xlsx";
const wb = XLSX.readFile(file);
console.log("sheets", wb.SheetNames);
for (const name of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
  console.log("---", name, "rows", rows.length);
  if (rows[0]) console.log("headers", Object.keys(rows[0]));
  console.log("sample", JSON.stringify(rows.slice(0, 3), null, 2));
  const unique = {};
  for (const key of Object.keys(rows[0] || {})) {
    const vals = [...new Set(rows.map((r) => String(r[key] ?? "").trim()).filter(Boolean))];
    if (vals.length && vals.length <= 40) unique[key] = vals;
    else if (vals.length) unique[key] = { count: vals.length, sample: vals.slice(0, 8) };
  }
  console.log("uniques", JSON.stringify(unique, null, 2));
}
