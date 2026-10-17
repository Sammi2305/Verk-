import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readImage } from "@/lib/storage";

// Serves job-request photos only to people allowed to see them: the customer
// who uploaded them, tradespeople invited to that request, and admins.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 404 });
  const upload = await db.upload.findUnique({ where: { id } });
  if (!upload) return new NextResponse(null, { status: 404 });

  let allowed = user.role === "ADMIN" || upload.ownerId === user.id;
  if (!allowed && upload.jobRequestId && user.role === "TRADESPERSON") {
    const inv = await db.jobInvitation.findFirst({
      where: { jobRequestId: upload.jobRequestId, profile: { userId: user.id }, jobRequest: { status: { not: "DRAFT" } } },
      select: { id: true },
    });
    allowed = inv !== null;
  }
  if (!allowed) return new NextResponse(null, { status: 404 });

  const body = await readImage(upload.storageKey);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": upload.mimeType,
      "Content-Length": String(body.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
