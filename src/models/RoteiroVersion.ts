import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRoteiroVersion extends Document {
  _id: Types.ObjectId;
  roteiroId: Types.ObjectId;
  title: string;
  content: string;
  snapshotBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoteiroVersionSchema = new Schema<IRoteiroVersion>(
  {
    roteiroId: { type: Schema.Types.ObjectId, ref: "Roteiro", required: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    snapshotBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

RoteiroVersionSchema.index({ roteiroId: 1, createdAt: -1 });

export default mongoose.models.RoteiroVersion ||
  mongoose.model<IRoteiroVersion>("RoteiroVersion", RoteiroVersionSchema);
