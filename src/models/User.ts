import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  username: string;
  password: string;
  avatar?: string;
  role: "admin" | "coordenador" | "roteirista" | "membro";
  skills: ("narrador" | "editor")[];
  managedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatar: { type: String },
    role: {
      type: String,
      enum: ["admin", "coordenador", "roteirista", "membro"],
      default: "membro",
    },
    skills: [{ type: String, enum: ["narrador", "editor"] }],
    managedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
