import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAttachment extends Document {
  _id: Types.ObjectId;
  scaleId: Types.ObjectId;
  weekNumber: number;
  stage: "roteiro" | "gravacao" | "edicao" | "revisao" | "concluido" | "geral";
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    scaleId: { type: Schema.Types.ObjectId, ref: "Scale", required: true },
    weekNumber: { type: Number, required: true, min: 1 },
    stage: {
      type: String,
      enum: ["roteiro", "gravacao", "edicao", "revisao", "concluido", "geral"],
      required: true,
    },
    url: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AttachmentSchema.index({ scaleId: 1, weekNumber: 1, stage: 1, createdAt: -1 });

export default mongoose.models.Attachment ||
  mongoose.model<IAttachment>("Attachment", AttachmentSchema);
