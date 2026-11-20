export const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/[‘’ʻʼ`´']/g, "'")
    .replace(/\s+/g, " ")
    .trim();