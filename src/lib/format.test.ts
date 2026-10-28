import { describe, expect, it } from "vitest";
import { formatDatum } from "./format";

describe("formatDatum", () => {
  it("zeigt reine Datumswerte unverändert", () => {
    expect(formatDatum("2026-10-01")).toBe("01.10.2026");
  });

  it("zeigt Zeitstempel in deutscher Zeit, nicht in UTC", () => {
    // 1.10. 01:30 Uhr in Berlin = 30.9. 23:30 UTC
    expect(formatDatum("2026-09-30T23:30:00+00:00")).toBe("01.10.2026");
    expect(formatDatum("2026-09-30T23:30:00Z")).toBe("01.10.2026");
    // Winterzeit: 1.1. 00:30 Uhr in Berlin = 31.12. 23:30 UTC
    expect(formatDatum("2026-12-31T23:30:00.123+00:00")).toBe("01.01.2027");
  });
});
