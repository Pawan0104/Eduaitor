import fs from "fs";
const p = "D:/eduaitor/Backend/controllers/hostelVisitorController.js";
let s = fs.readFileSync(p, "utf8");
const old = `    if (phoneMatch || (nameMatch && (!vp || !cp || phoneMatch || nameMatch))) {
      if (phoneMatch || nameMatch) {
        return { matched: true, relation: c.role };
      }
    }`;
const neu = `    if (phoneMatch || nameMatch) {
      return { matched: true, relation: c.role };
    }`;
if (!s.includes(old)) {
  console.log("pattern missing");
  const i = s.indexOf("if (phoneMatch");
  console.log(JSON.stringify(s.slice(i, i + 260)));
  process.exit(1);
}
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("match fixed");
