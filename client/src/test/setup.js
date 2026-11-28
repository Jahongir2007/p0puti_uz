// Runs before every test file
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup(); // unmount what the test rendered
  delete window.Telegram; // each test sets up its own fake Telegram when it needs one
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  document.documentElement.className = "";
  document.body.removeAttribute("style");
});
