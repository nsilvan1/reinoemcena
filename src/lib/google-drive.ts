import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { connectDB } from "@/lib/mongodb";
import DriveConnection, { type IDriveConnection } from "@/models/DriveConnection";

/**
 * Camada de integração com o Google Drive.
 *
 * Auth: OAuth2 (escopo somente-leitura). O app NÃO usa o login Google do
 * NextAuth — este fluxo é separado e guarda um refresh_token único da
 * conta-fonte do acervo (ver models/DriveConnection).
 *
 * Modelo de uso: sincronização sob demanda. As imagens são baixadas e
 * persistidas no blob-storage; o Drive é só a origem.
 */

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Extensões/MIMEs de imagem aceitos na importação. */
export const DRIVE_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

function getEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI || `${base}/api/drive/callback`;
  return { clientId, clientSecret, redirectUri };
}

/** True quando as credenciais OAuth estão configuradas no ambiente. */
export function isDriveConfigured(): boolean {
  const { clientId, clientSecret } = getEnv();
  return Boolean(clientId && clientSecret);
}

/** Cria um cliente OAuth2 cru (sem credenciais carregadas). */
export function createOAuthClient(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = getEnv();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Credenciais do Google ausentes (defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET)"
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Monta a URL de consentimento do Google (offline → retorna refresh_token). */
export function getConsentUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // força emissão de refresh_token mesmo em re-conexão
    scope: [DRIVE_SCOPE],
    state,
  });
}

/** Lê a conexão singleton (ou null). */
export async function getConnection(): Promise<IDriveConnection | null> {
  await connectDB();
  return DriveConnection.findOne({ key: "default" });
}

/**
 * Retorna um OAuth2Client autenticado e pronto para uso. Renova o access_token
 * via refresh_token quando necessário e persiste o novo token na conexão.
 * Lança se não houver conexão.
 */
export async function getAuthedClient(): Promise<OAuth2Client> {
  const conn = await getConnection();
  if (!conn) throw new Error("Google Drive não conectado");

  const client = createOAuthClient();
  client.setCredentials({
    refresh_token: conn.refreshToken,
    access_token: conn.accessToken,
    expiry_date: conn.expiresAt,
  });

  const fresh = !conn.expiresAt || conn.expiresAt - Date.now() < 60_000;
  if (fresh) {
    const { credentials } = await client.refreshAccessToken();
    conn.accessToken = credentials.access_token ?? conn.accessToken;
    conn.expiresAt = credentials.expiry_date ?? conn.expiresAt;
    if (credentials.refresh_token) conn.refreshToken = credentials.refresh_token;
    await conn.save();
    client.setCredentials(credentials);
  }

  return client;
}

/** Lista os filhos diretos (pastas + arquivos) de uma pasta do Drive. */
export async function listChildren(
  client: OAuth2Client,
  folderId: string
): Promise<DriveFile[]> {
  const drive = google.drive({ version: "v3", auth: client });
  const out: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
      pageSize: 1000,
      orderBy: "name",
      // Suporta Shared Drives além do "My Drive".
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (f.id && f.name && f.mimeType) {
        out.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime ?? "",
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return out;
}

export function isFolder(file: DriveFile): boolean {
  return file.mimeType === FOLDER_MIME;
}

export function isImage(file: DriveFile): boolean {
  return DRIVE_IMAGE_MIMES.has(file.mimeType.toLowerCase());
}

/** Lista apenas as subpastas diretas de uma pasta. */
export async function listSubfolders(
  client: OAuth2Client,
  folderId: string
): Promise<DriveFile[]> {
  const children = await listChildren(client, folderId);
  return children.filter(isFolder);
}

/** Baixa o conteúdo binário de um arquivo do Drive. */
export async function downloadFile(
  client: OAuth2Client,
  fileId: string
): Promise<Buffer> {
  const drive = google.drive({ version: "v3", auth: client });
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/** Mapeia MIME do Drive para extensão de arquivo. */
export function mimeToExt(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  return "jpg";
}
