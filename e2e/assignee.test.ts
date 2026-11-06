// Run: npx tsx e2e/assignee.test.ts
import assert from "node:assert/strict";
import { isAssignedTo, assigneeName } from "../client/src/lib/assignee";

const razorBill = { id: "u1", firstName: "Razor", lastName: "Bill" }; // the account Pooja logs in with
const pooja = { id: "u1", firstName: "Pooja", lastName: "Singh" };
const ranveer = { id: "u2", firstName: "ranveer", lastName: "razorveda" };

const cases: [string, boolean][] = [];
const check = (name: string, actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected, name); cases.push([name, true]); };

// The reported bug: "razor" is a substring of "ranveer razorveda"
check("Ranveer's linked story is not Razor Bill's", isAssignedTo({ assignedTo: "u2", person: "ranveer razorveda" }, razorBill), false);
check("Ranveer's unlinked story is not Razor Bill's", isAssignedTo({ assignedTo: null, person: "ranveer razorveda" }, razorBill), false);
check("Ranveer's story is Ranveer's", isAssignedTo({ assignedTo: "u2", person: "x" }, ranveer), true);
// id beats stale text, in both directions
check("id match wins over stale name text", isAssignedTo({ assignedTo: "u1", person: "Razor Bill" }, pooja), true);
check("id mismatch wins over matching name text", isAssignedTo({ assignedTo: "u2", person: "Pooja Singh" }, pooja), false);
// legacy rows without an id: exact full name only, whitespace/case tolerant
check("legacy exact name", isAssignedTo({ assignedTo: null, person: "pooja  SINGH" }, pooja), true);
check("legacy first name only does not match", isAssignedTo({ assignedTo: null, person: "Pooja" }, pooja), false);
check("Unassigned matches nobody", isAssignedTo({ assignedTo: null, person: "Unassigned" }, pooja), false);
check("no user", isAssignedTo({ assignedTo: "u1" }, null), false);
// display name follows the user's current name, not the stored text
check("display uses current name", assigneeName({ assignedTo: "u1", person: "Razor Bill" }, [pooja]), "Pooja Singh");
check("display falls back to stored text", assigneeName({ assignedTo: null, person: "Old Name" }, [pooja]), "Old Name");
check("display unassigned", assigneeName({ assignedTo: null, person: "" }, [pooja]), "Unassigned");

console.log(`assignee: ${cases.length} checks passed`);
