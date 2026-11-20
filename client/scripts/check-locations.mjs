import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("src/data/locations.json", "utf8"));

for (const l of data) {
  (l.alt ?? []).forEach((s, i) => {
    if (/[а-яё]/i.test(s) && /[a-z]/i.test(s)) {
      console.log(`id ${l.id} alt[${i}] has Latin letters: ${s}`);
    }
  });
  if (!l.alt?.[1] || !/[а-яё]/i.test(l.alt[1])) {
    console.log(`id ${l.id} (${l.name}) has no Russian name in alt[1]`);
  }
}