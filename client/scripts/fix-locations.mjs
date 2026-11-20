import fs from "node:fs";

const FILE = "src/data/locations.json";
const LOOKALIKES = { a: "а", c: "с", e: "е", o: "о", p: "р", x: "х", y: "у", k: "к", m: "м", t: "т",
  A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х" };

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
let fixed = 0;

for (const l of data) {
  l.alt = (l.alt ?? []).map((s) => {
    if (!/[а-яё]/i.test(s) || !/[a-z]/i.test(s)) return s;
    const clean = s.replace(/[a-zA-Z]/g, (ch) => LOOKALIKES[ch] ?? ch);
    console.log(`id ${l.id}: ${s} → ${clean}`);
    fixed++;
    return clean;
  });
}

fs.writeFileSync(FILE, JSON.stringify(data));
console.log(`Fixed ${fixed} names`);