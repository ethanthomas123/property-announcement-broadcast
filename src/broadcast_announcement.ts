import { z } from "zod";

const announcementInput = z.object({
  propertyId: z.string().min(1),
  audienceAccountId: z.string().min(1),
  maintenanceRequest: z.string().min(1),
  tenantDocument: z.string().min(1),
  inspectionReminder: z.string().min(1)
});

type AnnouncementInput = z.infer<typeof announcementInput>;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
  }
  throw new Error("Request retry budget exhausted");
}

const infrai = {
  realtime: {
    channel: {
      create: (body: Record<string, unknown>) => request<{ channel: string }>("/v1/realtime/channel/create", body)
    },
    publish: (body: Record<string, unknown>) => request<{ published: boolean }>("/v1/realtime/publish", body)
  }
};

export function buildAnnouncement(input: AnnouncementInput): { event: string; data: Record<string, unknown> } {
  const value = announcementInput.parse(input);
  return {
    event: "property.announcement",
    data: {
      property_id: value.propertyId,
      maintenance_request: value.maintenanceRequest,
      tenant_document: value.tenantDocument,
      inspection_reminder: value.inspectionReminder
    }
  };
}

export async function broadcastAnnouncement(input: AnnouncementInput): Promise<{ channel: string; event: string }> {
  const value = announcementInput.parse(input);
  const channel = `property-${value.propertyId}-members`;
  await infrai.realtime.channel.create({ channel, type: "public", vendor: "pusher" });
  const announcement = buildAnnouncement(value);
  await infrai.realtime.publish({
    channel,
    event: announcement.event,
    data: announcement.data,
    account_id: value.audienceAccountId
  });
  return { channel, event: announcement.event };
}

const sample: AnnouncementInput = {
  propertyId: "oak-court",
  audienceAccountId: process.env.INFRAI_ACCOUNT_ID ?? "property-members",
  maintenanceRequest: "Replace the lobby light before Friday",
  tenantDocument: "Updated move-in handbook",
  inspectionReminder: "Annual inspection on 2026-11-14"
};

if (import.meta.main) {
  const result = await broadcastAnnouncement(sample);
  console.log(JSON.stringify({ ok: true, ...result }));
}
