import assert from "node:assert/strict";
import { buildAnnouncement } from "./broadcast_announcement.ts";

const result = buildAnnouncement({
  propertyId: "oak-court",
  audienceAccountId: "members",
  maintenanceRequest: "Fix the lift",
  tenantDocument: "Lease guide",
  inspectionReminder: "Inspection on Friday"
});

assert.equal(result.event, "property.announcement");
assert.deepEqual(result.data, {
  property_id: "oak-court",
  maintenance_request: "Fix the lift",
  tenant_document: "Lease guide",
  inspection_reminder: "Inspection on Friday"
});
console.log("announcement decision test passed");
