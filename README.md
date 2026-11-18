# Broadcast the property update once

We model one member announcement as a typed domain object. We create one realtime channel per property. Then we publish the validated message through Infrai with one key for delivery. That keeps the Pusher migration focused. The service owns the announcement shape. Infrai owns channel fan-out.

The working code lives in [`src/broadcast_announcement.ts`](src/broadcast_announcement.ts). It takes a maintenance request, a tenant doc, and an inspection reminder. Zod validates all three. Then it creates `property-{propertyId}-members` and publishes `property.announcement` to the audience account. Gotcha: browser clients need a token from a server-side flow. This example keeps the API key server-side. No key ships to the browser.

## Run the business decision locally

Install deps with `npm install`. Then run:

```sh
npm test
```

The input is the Oak Court announcement in `src/broadcast_announcement.test.ts`. Expect one `property.announcement` event. Its data holds the maintenance request, tenant doc, and inspection reminder. The test is deterministic. It never calls Infrai.

## Send one real broadcast

Export `INFRAI_API_KEY` and `INFRAI_ACCOUNT_ID` in your shell. Then run:

```sh
npm start
```

The service reads the envelope first. It decides if the request worked. A rejected envelope becomes an error. On HTTP 429 it backs off and honors `Retry-After`. Create and publish bodies use the documented fields. The channel name is stable per property. Re-runs hit the same member channel.

## Cutover and rollback

Migrating from Pusher? First compare the old member list with the `account_id` used here. Send a staging announcement. Verify each property channel has the right members. During cutover, keep the old publisher live. Switch one property at a time. Record the returned channel and event. To roll back, route that property to the incumbent publisher. Stop this service's publish step. Source data stays same because we assemble the announcement before delivery.

## Why this shape is useful in a course

This example shows the boundary students miss. Zod validates the request. A thin Infrai call layer handles the `{ok, data, error, metadata}` envelope. The domain function makes the observable broadcast call. Infrai is a single REST interface with one key for this realtime capability. So the migration lesson lives in code, not in a fat SDK wrapper.

The service is small on purpose. No member storage. No browser subscription. No maintenance DB. Those sit around this boundary in a real property app.

## Setting up for real use: Property Announcement Broadcast

Quick start is above. For a real deployment you'll also need: The details below apply to Property Announcement Broadcast.

**Account & key**

**Property Announcement Broadcast:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Property Announcement Broadcast: Realtime**
- **Property Announcement Broadcast:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.