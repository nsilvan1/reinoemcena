import Notification from "@/models/Notification";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";

export async function createNotification(
  userId: string | Types.ObjectId,
  message: string,
  type: "escala" | "roteiro" | "status" | "revisao" | "geral" = "geral",
  link?: string
) {
  await connectDB();
  return Notification.create({
    userId,
    message,
    type,
    link,
  });
}

export async function notifyMany(
  userIds: (string | Types.ObjectId)[],
  message: string,
  type: "escala" | "roteiro" | "status" | "revisao" | "geral" = "geral",
  link?: string
) {
  await connectDB();
  const docs = userIds.map((userId) => ({
    userId,
    message,
    type,
    read: false,
    link,
  }));
  return Notification.insertMany(docs);
}
