// Importa personagens das pastas extraídas do Drive para o acervo do app.
// Lida com:
//   - extensões .jpg/.jpeg/.png/.webp/.gif/.jfif (jfif tratado como JPEG)
//   - pastas-container que contêm só subpastas (Anjos, DISCIPULOS) — cada
//     subpasta vira um personagem separado
//   - personagens já existentes (pula por nome, idempotente)

const fs = require("fs");
const path = require("path");
const os = require("os");

const BASE_URL = "http://localhost:3000";
const TMP = os.tmpdir();
const RC_ROOT = path.join(TMP, "drive-import/personagens-rc/PERSONAGENS RC");
const BIBLICOS_ROOT = path.join(TMP, "drive-import/personagens-biblicos/PERSONAGENS BÍBLICOS 3-6 anos");

const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

async function login() {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cook = csrfRes.headers.get("set-cookie") || "";
  const r = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cook },
    body: new URLSearchParams({
      csrfToken,
      username: "admin",
      password: "admin123",
      redirect: "false",
      json: "true",
    }),
    redirect: "manual",
  });
  return cook + "; " + [...(r.headers.getSetCookie?.() ?? [])].join("; ");
}

async function listExistingNames(cookie) {
  const r = await fetch(`${BASE_URL}/api/characters`, { headers: { cookie } });
  if (!r.ok) return new Set();
  const list = await r.json();
  return new Set(list.map((c) => c.name));
}

async function uploadImage(cookie, filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = EXT_TO_MIME[ext];
  if (!mime) return null;
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: mime }), path.basename(filePath));
  const res = await fetch(`${BASE_URL}/api/characters/upload-image`, {
    method: "POST",
    headers: { cookie },
    body: fd,
  });
  if (!res.ok) {
    console.error(`    upload ${path.basename(filePath)} ${ext} -> ${res.status}`);
    return null;
  }
  return (await res.json()).url;
}

async function createCharacter(cookie, name, traits, coverImageUrl, gallery) {
  const res = await fetch(`${BASE_URL}/api/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ name, description: "", traits, coverImageUrl: coverImageUrl || undefined, gallery }),
  });
  if (!res.ok) {
    console.error(`    create ${name} -> ${res.status}: ${(await res.text()).slice(0, 150)}`);
    return null;
  }
  return res.json();
}

function listImageFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && EXT_TO_MIME[path.extname(d.name).toLowerCase()])
    .map((d) => path.join(dir, d.name));
}

function listSubdirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
}

function normalizeName(raw) {
  return raw.trim().replace(/\s+/g, " ");
}

async function importAsCharacter(cookie, name, dir, traits, existing) {
  if (existing.has(name)) {
    console.log(`  ${name}: já existe, pulando`);
    return null;
  }
  const imgs = listImageFiles(dir);
  if (imgs.length === 0) {
    console.log(`  ${name}: sem imagens, criando sem capa`);
    const r = await createCharacter(cookie, name, traits, undefined, []);
    if (r) existing.add(name);
    return r;
  }
  const urls = [];
  for (const f of imgs) {
    const u = await uploadImage(cookie, f);
    if (u) urls.push(u);
  }
  if (urls.length === 0) return null;
  const [cover, ...rest] = urls;
  const r = await createCharacter(cookie, name, traits, cover, rest.slice(0, 20));
  if (r) {
    existing.add(name);
    console.log(`  ${name}: capa + ${Math.min(rest.length, 20)} galeria`);
  }
  return r;
}

// Resolve uma "pasta-personagem": se tem só subpastas, expande cada subpasta
// como personagem (nome próprio). Se tem arquivos, cria 1 personagem.
async function processFolder(cookie, folderName, folderPath, traits, existing) {
  const files = listImageFiles(folderPath);
  const subs = listSubdirs(folderPath);

  if (files.length > 0) {
    await importAsCharacter(cookie, folderName, folderPath, traits, existing);
    // Se ainda tem subpastas além dos arquivos próprios, ignora — não é
    // padrão esperado nesse acervo
    return;
  }

  if (subs.length === 0) {
    await importAsCharacter(cookie, folderName, folderPath, traits, existing);
    return;
  }

  // Container: cada subpasta vira personagem com nome próprio (ou prefixo se
  // o nome não fizer sentido sozinho — heurística: incluímos prefixo do pai
  // quando o pai tem nome curto e diferente do filho)
  for (const sub of subs) {
    const subName = normalizeName(sub.name);
    // Se a subpasta já tem "Anjo" ou outra ref pro pai, mantém. Senão, prefixa.
    const looksRelated = subName.toLowerCase().includes(folderName.toLowerCase().slice(0, 4));
    const finalName = looksRelated ? subName : `${folderName} - ${subName}`;
    await importAsCharacter(
      cookie,
      finalName,
      path.join(folderPath, sub.name),
      traits,
      existing
    );
  }
}

async function main() {
  console.log("Login admin...");
  const cookie = await login();
  if (!cookie.includes("session-token")) {
    console.error("Login falhou.");
    process.exit(1);
  }
  const existing = await listExistingNames(cookie);
  console.log(`Já no acervo: ${existing.size} personagens\n`);

  console.log("=== PERSONAGENS RC (time) ===");
  for (const sub of listSubdirs(RC_ROOT)) {
    await processFolder(cookie, normalizeName(sub.name), path.join(RC_ROOT, sub.name), ["time RC"], existing);
  }

  console.log("\n=== PERSONAGENS BÍBLICOS ===");
  for (const letra of listSubdirs(BIBLICOS_ROOT)) {
    const letraDir = path.join(BIBLICOS_ROOT, letra.name);
    for (const ch of listSubdirs(letraDir)) {
      await processFolder(cookie, normalizeName(ch.name), path.join(letraDir, ch.name), ["bíblico", "3-6 anos"], existing);
    }
  }

  console.log("\nFinalizado.");
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
