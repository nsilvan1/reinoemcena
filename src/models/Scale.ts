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
  historyCardId?: Types.ObjectId;
  characterIds: Types.ObjectId[];
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
    historyCardId: { type: Schema.Types.ObjectId, ref: "HistoryCard" },
    characterIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Character" }],
      default: [],
      validate: {
        validator: (arr: unknown[]) => arr.length <= 20,
        message: "Máximo 20 personagens por semana",
      },
    },
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

// Mantém Roteiro.weekNumber consistente com Scale.weeks[].number sempre que a
// escala for salva. Não cobre updates via findOneAndUpdate com $set em weeks —
// se introduzir um endpoint que renumera semanas via update direto, chamar
// também manualmente o sync (ver lib/scale-sync.ts).
ScaleSchema.pre("save", async function () {
  if (!this.isModified("weeks")) return;
  const Roteiro = mongoose.models.Roteiro;
  if (!Roteiro) return;
  for (const week of this.weeks) {
    if (week.roteiro) {
      await Roteiro.updateOne(
        { _id: week.roteiro, weekNumber: { $ne: week.number } },
        { $set: { weekNumber: week.number, scaleId: this._id } }
      );
    }
  }
});

export default mongoose.models.Scale || mongoose.model<IScale>("Scale", ScaleSchema);
