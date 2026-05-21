import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Listing } from "./types";
import {
  formatFormalLabel,
  formatRequestRowAccessibilityLabel,
  getRequestRowFormals,
  requestFormalRoleLabel,
} from "./requestDisplay";

function listing(
  overrides: Partial<Listing> & Pick<Listing, "id" | "college">,
): Listing {
  return {
    ownerUserId: "user-a",
    dateTime: "2026-05-08T19:15:00.000Z",
    groupSize: 2,
    seatsAvailable: 1,
    members: [],
    year: "2",
    role: "Undergrad",
    message: "",
    menu: "",
    listingType: "swap",
    status: "active",
    createdAt: 0,
    ...overrides,
  };
}

describe("getRequestRowFormals", () => {
  const target = listing({ id: "t", college: "Keble" });
  const offering = listing({
    id: "o",
    college: "Magdalen",
    dateTime: "2026-06-02T19:00:00.000Z",
  });

  it("pay incoming is your listing only", () => {
    const slots = getRequestRowFormals({
      requestType: "pay",
      direction: "incoming",
      targetListing: target,
    });
    assert.equal(slots.length, 1);
    assert.equal(slots[0]?.role, "your_listing");
    assert.equal(slots[0]?.listing.id, "t");
  });

  it("pay outgoing is their listing only", () => {
    const slots = getRequestRowFormals({
      requestType: "pay",
      direction: "outgoing",
      targetListing: target,
    });
    assert.equal(slots.length, 1);
    assert.equal(slots[0]?.role, "their_listing");
  });

  it("swap outgoing orders your offering then their listing", () => {
    const slots = getRequestRowFormals({
      requestType: "swap",
      direction: "outgoing",
      targetListing: target,
      offeringListing: offering,
    });
    assert.deepEqual(
      slots.map((s) => s.role),
      ["your_offering", "their_listing"],
    );
  });

  it("swap incoming orders your listing then their offering", () => {
    const slots = getRequestRowFormals({
      requestType: "swap",
      direction: "incoming",
      targetListing: target,
      offeringListing: offering,
    });
    assert.deepEqual(
      slots.map((s) => s.role),
      ["your_listing", "their_offering"],
    );
  });

  it("accessibility label names each role and formal", () => {
    const slots = getRequestRowFormals({
      requestType: "swap",
      direction: "outgoing",
      targetListing: target,
      offeringListing: offering,
    });
    const label = formatRequestRowAccessibilityLabel(slots);
    assert.equal(
      label,
      `${requestFormalRoleLabel("your_offering")}, ${formatFormalLabel(offering)}. ${requestFormalRoleLabel("their_listing")}, ${formatFormalLabel(target)}`,
    );
  });
});
