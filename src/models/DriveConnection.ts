import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Conexão única (singleton) com o Google Drive do ministério.
 *
 * Um admin conecta a conta-fonte do acervo UMA vez; o refresh_token fica
 * guardado aqui e é reutilizado em toda sincronização. Todos os membros
 * enxergam o mesmo acervo importado dessa conta.
 *
 * Para garantir o singleton usamos a chave fixa `key: "default"` com índice
 * único — nunca deve existir mais de um documento.
 */
export interface IDriveConnection extends Document {
  _id: Types.ObjectId;
  key: "default";
  /** Token de longa duração usado para renovar o access_token. */
  refreshToken: string;
  /** Access token corrente (cache). Renovado sob demanda. */
  accessToken?: string;
  /** Quando o access_token expira (epoch ms). */
  expiresAt?: number;
  /** Email da conta Google conectada (exibição). */
  accountEmail?: string;
  /** Pasta raiz do acervo escolhida pelo usuário (null = raiz do Drive). */
  rootFolderId?: string;
  rootFolderName?: string;
  /** Quem conectou. */
  connectedBy: Types.ObjectId;
  /** Última sincronização concluída. */
  lastSyncedAt?: Date;
  /** Resumo da última sync (para exibir no painel). */
  lastSyncSummary?: {
    created: number;
    updated: number;
    images: number;
    errors: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DriveConnectionSchema = new Schema<IDriveConnection>(
  {
    key: { type: String, enum: ["default"], default: "default", required: true },
    refreshToken: { type: String, required: true },
    accessToken: { type: String },
    expiresAt: { type: Number },
    accountEmail: { type: String, trim: true },
    rootFolderId: { type: String, trim: true },
    rootFolderName: { type: String, trim: true },
    connectedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastSyncedAt: { type: Date },
    lastSyncSummary: {
      created: { type: Number },
      updated: { type: Number },
      images: { type: Number },
      errors: { type: Number },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        // Nunca expor tokens para o cliente.
        delete ret.refreshToken;
        delete ret.accessToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DriveConnectionSchema.index({ key: 1 }, { unique: true });

export default mongoose.models.DriveConnection ||
  mongoose.model<IDriveConnection>("DriveConnection", DriveConnectionSchema);
