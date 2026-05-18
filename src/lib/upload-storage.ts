// @deprecated — use `deleteUpload` de `@/lib/blob-storage` em código novo.
// Este módulo é mantido apenas para compatibilidade com imports existentes.
// Re-exporta `deleteUpload` sob o nome legado `unlinkUploadedFile`.
export { deleteUpload as unlinkUploadedFile } from "@/lib/blob-storage";
