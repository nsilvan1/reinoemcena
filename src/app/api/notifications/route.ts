import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/auth-helpers";

// GET /api/notifications
export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const notifications = await Notification.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(notifications);
}

// PUT /api/notifications — marcar como lida
export async function PUT(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const body = await req.json();

  if (body.markAllRead) {
    await Notification.updateMany({ userId: user.id, read: false }, { read: true });
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    await Notification.findOneAndUpdate({ _id: body.id, userId: user.id }, { read: true });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "ID ou markAllRead necessário" }, { status: 400 });
}
