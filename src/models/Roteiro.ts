import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRoteiroFile {
  _id: Types.ObjectId;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface IRoteiro extends Document {
  _id: Types.ObjectId;
  title: string;
  content?: string; // HTML from TipTap
  fileUrl?: string; // arquivo principal (compat) — primeiro item de files[]
  files: IRoteiroFile[];
  scaleId: Types.ObjectId;
  weekNumber: number;
  createdBy: Types.ObjectId;
  assignedEditors: Types.ObjectId[];
  assignedNarrators: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const RoteiroFileSchema = new Schema<IRoteiroFile>(
  {
    url: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const RoteiroSchema = new Schema<IRoteiro>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String },
    fileUrl: { type: String },
    files: { type: [RoteiroFileSchema], default: [] },
    scaleId: { type: Schema.Types.ObjectId, ref: "Scale", required: true },
    // Cache do número da semana — verdade canônica está em Scale.weeks[].number
    // (o pre-save de Scale mantém esse campo sincronizado).
    weekNumber: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedEditors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assignedNarrators: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

RoteiroSchema.index({ scaleId: 1, weekNumber: 1 });

export default mongoose.models.Roteiro || mongoose.model<IRoteiro>("Roteiro", RoteiroSchema);
