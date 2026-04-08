import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRoteiro extends Document {
  _id: Types.ObjectId;
  title: string;
  content?: string; // HTML from TipTap
  fileUrl?: string; // uploaded file
  scaleId: Types.ObjectId;
  weekNumber: number;
  createdBy: Types.ObjectId;
  assignedEditors: Types.ObjectId[];
  assignedNarrators: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const RoteiroSchema = new Schema<IRoteiro>(
  {
    title: { type: String, required: true },
    content: { type: String },
    fileUrl: { type: String },
    scaleId: { type: Schema.Types.ObjectId, ref: "Scale", required: true },
    weekNumber: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedEditors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assignedNarrators: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.models.Roteiro || mongoose.model<IRoteiro>("Roteiro", RoteiroSchema);
