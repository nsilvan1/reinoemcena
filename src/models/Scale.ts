import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWeek {
  number: number;
  theme: string;
  deadline: Date;
  status: "roteiro" | "gravacao" | "edicao" | "revisao" | "concluido";
  assignments: {
    roteiristas: Types.ObjectId[];
    editores: Types.ObjectId[];
    narradores: Types.ObjectId[];
  };
  roteiro?: Types.ObjectId;
}

export interface IScale extends Document {
  _id: Types.ObjectId;
  title: string;
  month: string; // "2026-04"
  weeks: IWeek[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WeekSchema = new Schema<IWeek>(
  {
    number: { type: Number, required: true, min: 1 },
    theme: { type: String, required: true },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ["roteiro", "gravacao", "edicao", "revisao", "concluido"],
      default: "roteiro",
    },
    assignments: {
      roteiristas: [{ type: Schema.Types.ObjectId, ref: "User" }],
      editores: [{ type: Schema.Types.ObjectId, ref: "User" }],
      narradores: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    roteiro: { type: Schema.Types.ObjectId, ref: "Roteiro" },
  },
  { _id: false }
);

const ScaleSchema = new Schema<IScale>(
  {
    title: { type: String, required: true, trim: true },
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, "Formato inválido: use YYYY-MM"],
    },
    weeks: [WeekSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ScaleSchema.index({ month: -1 });

export default mongoose.models.Scale || mongoose.model<IScale>("Scale", ScaleSchema);
