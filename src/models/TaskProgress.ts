import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITaskProgress extends Document {
  _id: Types.ObjectId;
  scaleId: Types.ObjectId;
  weekNumber: number;
  userId: Types.ObjectId;
  role: "narrador" | "editor" | "roteirista";
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  linkUrl?: string; // link externo (Drive, YouTube, etc.)
  createdAt: Date;
  updatedAt: Date;
}

const TaskProgressSchema = new Schema<ITaskProgress>(
  {
    scaleId: { type: Schema.Types.ObjectId, ref: "Scale", required: true },
    weekNumber: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["narrador", "editor", "roteirista"],
      required: true,
    },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    notes: { type: String },
    linkUrl: { type: String },
  },
  { timestamps: true }
);

TaskProgressSchema.index({ scaleId: 1, weekNumber: 1, userId: 1, role: 1 }, { unique: true });

export default mongoose.models.TaskProgress ||
  mongoose.model<ITaskProgress>("TaskProgress", TaskProgressSchema);
