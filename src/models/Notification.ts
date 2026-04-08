import mongoose, { Schema, Document, Types } from "mongoose";

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  message: string;
  type: "escala" | "roteiro" | "status" | "revisao" | "geral";
  read: boolean;
  link?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["escala", "roteiro", "status", "revisao", "geral"],
      default: "geral",
    },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
