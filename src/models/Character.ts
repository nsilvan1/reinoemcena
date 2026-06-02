import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICharacter extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  traits: string[];
  coverImageUrl?: string;
  gallery: string[];
  createdBy: Types.ObjectId;
  /** Origem do personagem: criado manualmente ou sincronizado do Drive. */
  source: "manual" | "drive";
  /** ID da pasta no Drive que originou este personagem (chave de idempotência). */
  driveFolderId?: string;
  /** Maior modifiedTime entre os arquivos da pasta na última sync (detecta mudanças). */
  driveModifiedTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CharacterSchema = new Schema<ICharacter>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    traits: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 10 && arr.every((t) => t.length <= 30),
        message: "Máximo 10 traits, cada um com até 30 caracteres",
      },
    },
    coverImageUrl: { type: String },
    gallery: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 20,
        message: "Máximo 20 imagens na galeria",
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: ["manual", "drive"], default: "manual" },
    driveFolderId: { type: String, trim: true },
    driveModifiedTime: { type: String, trim: true },
  },
  { timestamps: true }
);

CharacterSchema.index({ name: 1 });
CharacterSchema.index({ createdAt: -1 });
// Idempotência da sync: localiza rapidamente o personagem de uma pasta do Drive.
// `sparse` porque personagens manuais não têm driveFolderId.
CharacterSchema.index({ driveFolderId: 1 }, { unique: true, sparse: true });

export default mongoose.models.Character ||
  mongoose.model<ICharacter>("Character", CharacterSchema);
