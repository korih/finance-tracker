import { describe, it, expect } from "vitest";
import { PatternClassifier, type Category } from "../classify";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    spreadsheet_id: "sheet-1",
    name: "Groceries",
    color: "#4caf50",
    patterns: [],
    hide_from_merchants: false,
    hide_from_chart: false,
    hide_from_stats: false,
    sort_order: 0,
    inserted_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const clf = new PatternClassifier();

// ─── PatternClassifier ────────────────────────────────────────────────────────

describe("PatternClassifier", () => {
  it("has the name 'pattern'", () => {
    expect(clf.name).toBe("pattern");
  });

  describe("matching", () => {
    it("returns category name when a pattern matches the merchant", () => {
      const cats = [makeCategory({ name: "Groceries", patterns: ["walmart"] })];
      expect(clf.classify("Walmart", cats)).toBe("Groceries");
    });

    it("is case-insensitive", () => {
      const cats = [makeCategory({ patterns: ["WALMART"] })];
      expect(clf.classify("walmart", cats)).toBe("Groceries");
      expect(clf.classify("WALMART", cats)).toBe("Groceries");
      expect(clf.classify("WaLmArT", cats)).toBe("Groceries");
    });

    it("matches partial merchant names (regex sub-string)", () => {
      const cats = [makeCategory({ patterns: ["star"] })];
      expect(clf.classify("Starbucks", cats)).toBe("Groceries");
    });

    it("matches full merchant names with anchors", () => {
      const cats = [makeCategory({ patterns: ["^Starbucks$"] })];
      expect(clf.classify("Starbucks", cats)).toBe("Groceries");
      expect(clf.classify("Starbucks Coffee", cats)).toBeNull();
    });

    it("supports regex alternation (a|b)", () => {
      const cats = [makeCategory({ name: "Coffee", patterns: ["starbucks|tim hortons|costa"] })];
      expect(clf.classify("Starbucks", cats)).toBe("Coffee");
      expect(clf.classify("Tim Hortons", cats)).toBe("Coffee");
      expect(clf.classify("Costa Coffee", cats)).toBe("Coffee");
    });

    it("supports regex character classes", () => {
      const cats = [makeCategory({ patterns: ["[Mm]c[Dd]onald"] })];
      expect(clf.classify("McDonalds", cats)).toBe("Groceries");
      expect(clf.classify("mcdonalds", cats)).toBe("Groceries");
    });

    it("supports dot-star patterns", () => {
      const cats = [makeCategory({ patterns: ["Amazon.*"] })];
      expect(clf.classify("Amazon Prime", cats)).toBe("Groceries");
      expect(clf.classify("Amazon Marketplace", cats)).toBe("Groceries");
    });
  });

  describe("no match", () => {
    it("returns null when no category pattern matches", () => {
      const cats = [makeCategory({ patterns: ["walmart"] })];
      expect(clf.classify("Starbucks", cats)).toBeNull();
    });

    it("returns null for empty categories array", () => {
      expect(clf.classify("Walmart", [])).toBeNull();
    });

    it("returns null when category has no patterns", () => {
      const cats = [makeCategory({ patterns: [] })];
      expect(clf.classify("Walmart", cats)).toBeNull();
    });
  });

  describe("pattern edge cases", () => {
    it("skips empty pattern strings without throwing", () => {
      const cats = [makeCategory({ name: "Food", patterns: ["", "  ", "walmart"] })];
      expect(clf.classify("Walmart", cats)).toBe("Food");
    });

    it("skips whitespace-only patterns", () => {
      const cats = [makeCategory({ patterns: ["   "] })];
      expect(clf.classify("anything", cats)).toBeNull();
    });

    it("silently skips malformed regex patterns without crashing", () => {
      const cats = [
        makeCategory({ name: "Bad", patterns: ["[invalid", "**", "(unclosed"] }),
        makeCategory({ name: "Good", patterns: ["walmart"] }),
      ];
      // Should not throw; should fall through to the Good category
      expect(() => clf.classify("Walmart", cats)).not.toThrow();
      expect(clf.classify("Walmart", cats)).toBe("Good");
    });

    it("returns null if all patterns are malformed", () => {
      const cats = [makeCategory({ patterns: ["[broken"] })];
      expect(clf.classify("Walmart", cats)).toBeNull();
    });

    it("trims leading/trailing whitespace from the merchant before matching", () => {
      const cats = [makeCategory({ patterns: ["walmart"] })];
      expect(clf.classify("  Walmart  ", cats)).toBe("Groceries");
    });
  });

  describe("category ordering", () => {
    it("first category with a matching pattern wins", () => {
      const cats = [
        makeCategory({ name: "First", patterns: ["starbucks"] }),
        makeCategory({ name: "Second", patterns: ["starbucks"] }),
      ];
      expect(clf.classify("Starbucks", cats)).toBe("First");
    });

    it("tries each category's patterns in order before moving to next category", () => {
      const cats = [
        makeCategory({ name: "A", patterns: ["no-match-1", "no-match-2"] }),
        makeCategory({ name: "B", patterns: ["starbucks"] }),
      ];
      expect(clf.classify("Starbucks", cats)).toBe("B");
    });
  });

  describe("multiple patterns per category", () => {
    it("matches on any one of a category's patterns", () => {
      const cats = [
        makeCategory({
          name: "Dining",
          patterns: ["mcdonald", "burger king", "kfc", "popeyes"],
        }),
      ];
      expect(clf.classify("McDonald's", cats)).toBe("Dining");
      expect(clf.classify("Burger King", cats)).toBe("Dining");
      expect(clf.classify("KFC", cats)).toBe("Dining");
    });
  });
});
