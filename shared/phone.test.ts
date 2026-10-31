import { expect, test } from "bun:test";
import { findPhoneNumber } from "./phone.ts";

test.each([
  ["host Chị Lan 0903 112 845", "0903112845"],
  ["call 0903.112.845 after 9pm", "0903112845"],
  ["+84 903 112 845", "+84903112845"],
  ["0903-112-845", "0903112845"],
  ["Booking 7K2Q-91 · door code 4471 · host 0903 112 845", "0903112845"],
])("%p finds %p", (text, expected) => {
  expect(findPhoneNumber(text)).toBe(expected);
});

test.each([
  ["door code 4471"],
  ["Pay at check-in, cash only"],
  ["room 12 34"],
  ["123456789012"],
])("%p has no phone number", (text) => {
  expect(findPhoneNumber(text)).toBeNull();
});
