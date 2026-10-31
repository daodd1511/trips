import { expect, test } from "bun:test";
import { findPhoneNumber } from "./phone.ts";

test.each([
  ["0358937727", "0358937727"],
  ["host Chị Lan 0358937727", "0358937727"],
  ["Số 12 0358937727", "0358937727"],
  ["Gia 30.000 0358937727", "0358937727"],
  ["0358937727 0912345678", "0358937727"],
  ["call 0358937727, after 9pm", "0358937727"],
])("%p finds %p", (text, expected) => {
  expect(findPhoneNumber(text)).toBe(expected);
});

test.each([
  ["door code 4471"],
  ["Pay at check-in, cash only"],
  ["0903 112 845"],
  ["+84358937727"],
  ["358937727"],
  ["03589377270"],
  ["2026-11-19"],
])("%p has no phone number", (text) => {
  expect(findPhoneNumber(text)).toBeNull();
});
