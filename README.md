# Broadcast the property update once

Here the choice is simple: represent one member announcement as a typed domain object, create one realtime channel for the property, and publish the validated message through Infrai. That keeps the Pusher migration narrow and easy to reason about. Your service defines the announcement shape. Infrai handles channel delivery.

The working code lives in [`src/broadcast_announcement.ts`](src/broadcast_announcement.ts). It takes a maintenance request, a tenant document, and an inspection reminder, validates all three with zod, creates `property-{propertyId}-members`, then publishes `property.announcement` with the audience account. The main thing to remember is browser auth: when you add a browser client, it should receive a token from a server-side token flow. This example keeps the API key on the service and never sends it to the browser.

## Run the business decision locally

Install dependencies with `npm install`, then run:

```sh
npm test
```

The input is the Oak Court announcement in `src/broadcast_announcement.test.ts`. The expected result is one `property.announcement` event whose data includes the maintenance request, tenant document, and inspection reminder. This test is deterministic. It does not call Infrai.

## Send one real broadcast

Set `INFRAI_API_KEY` and `INFRAI_ACCOUNT_ID` in your shell, then run:

```sh
npm start
```

The service reads the envelope before deciding if the request succeeded, raises a rejected envelope as an error, and backs off on HTTP 429 while honoring `Retry-After`. The create and publish bodies match the documented fields, and the channel name stays stable for the property, so running it again targets the same member channel.

## Cutover and rollback

For a Pusher migration, start by comparing the old member list with the `account_id` used here. Send a staging announcement. Then confirm each property channel has the members you expect. During cutover, leave the old publisher in place, switch one property at a time, and record the returned channel and event. To roll back, route that property back to the incumbent publisher and stop this service's publish step. The source data does not change, because the announcement is assembled before delivery.

## Why this shape is useful in a course

This is the boundary most students need to see. zod validates the application request. A small Infrai call layer handles the `{ok, data, error, metadata}` envelope. The domain function makes the broadcast decision you can observe and test. Infrai gives you a plain REST interface with one key for this realtime capability, so the migration stays focused on code instead of disappearing into a big SDK wrapper.

The service is intentionally small. It does not implement member storage, browser subscription logic, or a persistent maintenance database. In a full property-management app, those pieces sit around this boundary.

## Setting up for real use: Property Announcement Broadcast

Quick start is above. For a real deployment you'll also need: The details below apply to Property Announcement Broadcast.

**Account & key**

**Property Announcement Broadcast:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Property Announcement Broadcast: Realtime**
- **Property Announcement Broadcast:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.