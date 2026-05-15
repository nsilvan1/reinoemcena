import mongoose, { Schema, Document, Types } from "mongoose";

export interface IComment extends Document {
  _id: Types.ObjectId;
  scaleId: Types.ObjectId;
  weekNumber: number;
  userId: Types.ObjectId;
  message: string;
  stage: "roteiro" | "gravacao" | "edicao" | "revisao" | "geral";
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    scaleId: { type: Schema.Types.ObjectId, ref: "Scale", required: true },
    weekNumber: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, "Mensagem muito longa (máx 2000 caracteres)"],
    },
    stage: {
      type: String,
      enum: ["roteiro", "gravacao", "edicao", "revisao", "geral"],
      default: "geral",
    },
  },
  { timestamps: true }
);

CommentSchema.index({ scaleId: 1, weekNumber: 1 });

export default mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);
