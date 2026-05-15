import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICharacter extends Document {
  _id: Types.ObjectId;
  scaleId: Types.ObjectId;
  weekNumber: number;
  name: string;
  description: string;
  prompt: string;
  imageUrl?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CharacterSchema = new Schema<ICharacter>(
  {
    scaleId: { type: Schema.Types.ObjectId, ref: "Scale", required: true },
    weekNumber: { type: Number, required: true, min: 1 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    prompt: { type: String, default: "", trim: true, maxlength: 4000 },
    imageUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CharacterSchema.index({ scaleId: 1, weekNumber: 1, createdAt: -1 });

export default mongoose.models.Character ||
  mongoose.model<ICharacter>("Character", CharacterSchema);
