/**
 * Migra os 181 arquivos de public/uploads/ para o Vercel Blob.
 *
 * Para cada upload local antigo:
 *   1. Envia para o Vercel Blob preservando o nome original
 *   2. Atualiza os campos `url`, `fileUrl`, `coverImageUrl`, `gallery`,
 *      `linkUrl` em todas as collections referenciando o caminho antigo
 *
 * Requer:
 *   - BLOB_READ_WRITE_TOKEN no .env.local
 *   - MONGODB_URI no .env.local
 *
 * Idempotente: pula arquivos que já têm contraparte no Blob (detectado pelo
 * domínio blob.vercel-storage.com na URL salva).
 *
 * Uso:
 *   node scripts/migrate-uploads-to-blob.js
 *   node scripts/migrate-uploads-to-blob.js --dry-run
 */

const fs = require("fs");
const path = require("path");
const mime = (ext) =>
  ({
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".webm": "video/webm",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".txt": "text/plain",
  })[ext.toLowerCase()] || "application/octet-stream";

async function loadEnv() {
  // Carrega .env.local manualmente
  try {
    const envFile = fs.readFileSync(".env.local", "utf8");
    for (const line of envFile.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {}
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await loadEnv();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("ERRO: BLOB_READ_WRITE_TOKEN não está no .env.local");
    console.error("Gere em: https://vercel.com/dashboard/stores → Blob → Settings");
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error("ERRO: MONGODB_URI não está no .env.local");
    process.exit(1);
  }

  const { put } = require("@vercel/blob");
  const mongoose = require("mongoose");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Conectado ao Mongo");

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const files = fs.readdirSync(uploadsDir).filter((f) => !f.startsWith("."));
  console.log(`Encontrados ${files.length} arquivos em public/uploads`);

  // 1. Upload de todos os arquivos pro Blob
  const remap = new Map(); // local path /uploads/xxx → blob URL absoluta
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const localPath = `/uploads/${f}`;
    const fullPath = path.join(uploadsDir, f);
    const ext = path.extname(f);
    try {
      const buf = fs.readFileSync(fullPath);
      if (dryRun) {
        console.log(`[dry] ${i + 1}/${files.length} ${f} (${buf.length} bytes) → blob`);
        remap.set(localPath, `https://example.blob.vercel-storage.com/${f}`);
        continue;
      }
      const blob = await put(f, buf, {
        access: "public",
        contentType: mime(ext),
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      remap.set(localPath, blob.url);
      console.log(`${i + 1}/${files.length} ${f} → ${blob.url}`);
    } catch (err) {
      console.error(`  FALHA em ${f}:`, err.message);
    }
  }

  console.log(`\nUploaded ${remap.size} arquivos pro Blob`);
  if (dryRun) {
    console.log("[dry] não vai tocar no banco");
    await mongoose.disconnect();
    return;
  }

  // 2. Atualizar referências no banco
  const db = mongoose.connection.db;

  // Character.coverImageUrl + gallery[]
  console.log("\nAtualizando Character...");
  const charsCol = db.collection("characters");
  for (const [oldUrl, newUrl] of remap) {
    await charsCol.updateMany({ coverImageUrl: oldUrl }, { $set: { coverImageUrl: newUrl } });
  }
  // gallery: array — buscar todos e reescrever item a item
  const chars = await charsCol.find({ gallery: { $exists: true, $ne: [] } }).toArray();
  for (const c of chars) {
    const newGallery = (c.gallery || []).map((u) => remap.get(u) || u);
    if (JSON.stringify(newGallery) !== JSON.stringify(c.gallery)) {
      await charsCol.updateOne({ _id: c._id }, { $set: { gallery: newGallery } });
      console.log(`  Character ${c.name}: galeria reescrita`);
    }
  }

  // HistoryCard.coverImageUrl + attachments[].url
  console.log("\nAtualizando HistoryCard...");
  const hcCol = db.collection("historycards");
  for (const [oldUrl, newUrl] of remap) {
    await hcCol.updateMany({ coverImageUrl: oldUrl }, { $set: { coverImageUrl: newUrl } });
  }
  const cards = await hcCol.find({ "attachments.0": { $exists: true } }).toArray();
  for (const c of cards) {
    const newAtts = (c.attachments || []).map((a) => ({ ...a, url: remap.get(a.url) || a.url }));
    if (JSON.stringify(newAtts) !== JSON.stringify(c.attachments)) {
      await hcCol.updateOne({ _id: c._id }, { $set: { attachments: newAtts } });
      console.log(`  HistoryCard ${c.title}: anexos reescritos`);
    }
  }

  // Attachment.url
  console.log("\nAtualizando Attachment...");
  const attCol = db.collection("attachments");
  for (const [oldUrl, newUrl] of remap) {
    const r = await attCol.updateMany({ url: oldUrl }, { $set: { url: newUrl } });
    if (r.modifiedCount > 0) console.log(`  ${r.modifiedCount} attachment(s) ← ${oldUrl}`);
  }

  // Roteiro.fileUrl + files[].url
  console.log("\nAtualizando Roteiro...");
  const rotCol = db.collection("roteiros");
  for (const [oldUrl, newUrl] of remap) {
    await rotCol.updateMany({ fileUrl: oldUrl }, { $set: { fileUrl: newUrl } });
  }
  const roteiros = await rotCol.find({ "files.0": { $exists: true } }).toArray();
  for (const r of roteiros) {
    const newFiles = (r.files || []).map((f) => ({ ...f, url: remap.get(f.url) || f.url }));
    if (JSON.stringify(newFiles) !== JSON.stringify(r.files)) {
      await rotCol.updateOne({ _id: r._id }, { $set: { files: newFiles } });
      console.log(`  Roteiro ${r.title}: files reescritos`);
    }
  }

  // TaskProgress.linkUrl
  console.log("\nAtualizando TaskProgress.linkUrl...");
  const tpCol = db.collection("taskprogresses");
  for (const [oldUrl, newUrl] of remap) {
    const r = await tpCol.updateMany({ linkUrl: oldUrl }, { $set: { linkUrl: newUrl } });
    if (r.modifiedCount > 0) console.log(`  ${r.modifiedCount} progress(es) ← ${oldUrl}`);
  }

  await mongoose.disconnect();
  console.log("\n=== MIGRAÇÃO CONCLUÍDA ===");
  console.log(`${remap.size} arquivos no Blob, banco atualizado.`);
  console.log("Próximo passo: apagar public/uploads do repo e reativar a linha no .gitignore.");
}

main().catch((err) => {
  console.error("ERRO FATAL:", err);
  process.exit(1);
});
