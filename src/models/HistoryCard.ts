import mongoose, { Schema, Document, Types } from "mongoose";

export interface IHistoryCard extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  traits: string[];
  coverImageUrl?: string;
  attachments: { url: string; name: string; mimeType: string; size: number }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSubSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const HistoryCardSchema = new Schema<IHistoryCard>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    traits: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 10 && arr.every((t) => t.length <= 30),
        message: "Máximo 10 traits, cada um com até 30 caracteres",
      },
    },
    coverImageUrl: { type: String },
    attachments: {
      type: [AttachmentSubSchema],
      default: [],
      validate: {
        validator: (arr: unknown[]) => arr.length <= 20,
        message: "Máximo 20 anexos",
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

HistoryCardSchema.index({ title: 1 });
HistoryCardSchema.index({ createdAt: -1 });

export default mongoose.models.HistoryCard ||
  mongoose.model<IHistoryCard>("HistoryCard", HistoryCardSchema);
