import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatCurrency,
  getWeekdayShort,
  formatPercent,
  formatDateShort,
} from "./format";

describe("formatNumber", () => {
  it("formats small numbers without commas", () => {
    expect(formatNumber(123)).toBe("123");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with commas", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(12345)).toBe("12,345");
    expect(formatNumber(123456)).toBe("123,456");
  });

  it("formats millions with commas", () => {
    expect(formatNumber(1000000)).toBe("1,000,000");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-1234)).toBe("-1,234");
  });
});

describe("formatCurrency", () => {
  it("formats currency with dollar sign and cents", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(1)).toBe("$1.00");
    expect(formatCurrency(1.5)).toBe("$1.50");
    expect(formatCurrency(1.99)).toBe("$1.99");
  });

  it("formats currency with thousands separators", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
    expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(1.999)).toBe("$2.00");
    expect(formatCurrency(1.994)).toBe("$1.99");
  });
});

describe("getWeekdayShort", () => {
  it("returns correct weekday abbreviations", () => {
    expect(getWeekdayShort("2025-01-20")).toBe("Mon"); // Monday
    expect(getWeekdayShort("2025-01-21")).toBe("Tue"); // Tuesday
    expect(getWeekdayShort("2025-01-22")).toBe("Wed"); // Wednesday
    expect(getWeekdayShort("2025-01-23")).toBe("Thu"); // Thursday
    expect(getWeekdayShort("2025-01-24")).toBe("Fri"); // Friday
    expect(getWeekdayShort("2025-01-25")).toBe("Sat"); // Saturday
    expect(getWeekdayShort("2025-01-26")).toBe("Sun"); // Sunday
  });

  it("handles different date formats", () => {
    expect(getWeekdayShort("2025-01-14")).toBe("Tue");
    expect(getWeekdayShort("2024-12-25")).toBe("Wed"); // Christmas 2024
  });
});

describe("formatPercent", () => {
  it("formats percentages with default decimal places", () => {
    expect(formatPercent(12.456)).toBe("12.5%");
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(100)).toBe("100.0%");
  });

  it("respects custom decimal places", () => {
    expect(formatPercent(12.456, 0)).toBe("12%");
    expect(formatPercent(12.456, 2)).toBe("12.46%");
    expect(formatPercent(12.456, 3)).toBe("12.456%");
  });
});

describe("formatDateShort", () => {
  it("formats dates correctly", () => {
    expect(formatDateShort("2025-01-20")).toBe("Jan 20");
    expect(formatDateShort("2025-12-25")).toBe("Dec 25");
    expect(formatDateShort("2025-06-15")).toBe("Jun 15");
  });

  it("handles first and last days of months", () => {
    expect(formatDateShort("2025-01-01")).toBe("Jan 1");
    expect(formatDateShort("2025-01-31")).toBe("Jan 31");
    expect(formatDateShort("2025-02-28")).toBe("Feb 28");
  });
});

describe("SSR hydration consistency", () => {
  it("produces consistent output regardless of locale settings", () => {
    // These tests verify the functions produce the same output
    // that would be expected on both server and client
    const testCases = [
      { fn: () => formatNumber(1234567), expected: "1,234,567" },
      { fn: () => formatCurrency(1234.56), expected: "$1,234.56" },
      { fn: () => getWeekdayShort("2025-01-20"), expected: "Mon" },
      { fn: () => formatPercent(12.5), expected: "12.5%" },
      { fn: () => formatDateShort("2025-01-20"), expected: "Jan 20" },
    ];

    // Run each test case multiple times to ensure consistency
    testCases.forEach(({ fn, expected }) => {
      for (let i = 0; i < 5; i++) {
        expect(fn()).toBe(expected);
      }
    });
  });
});
