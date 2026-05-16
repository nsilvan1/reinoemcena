// Apaga todos os personagens e history-cards do acervo e reimporta a partir
// das pastas locais:
//   C:\Users\Nathan\Downloads\PERSONAGENS RC
//   C:\Users\Nathan\Downloads\PERSONAGENS BÍBLICOS 3-6 anos
//
// Requer dev server rodando em http://localhost:3000 e usuário admin/admin123.

const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";
const RC_ROOT = "C:\\Users\\Nathan\\Downloads\\PERSONAGENS RC";
const BIBLICOS_ROOT = "C:\\Users\\Nathan\\Downloads\\PERSONAGENS BÍBLICOS 3-6 anos";

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

async function wipe(cookie, endpoint, label) {
  const r = await fetch(`${BASE_URL}/api/${endpoint}`, { headers: { cookie } });
  if (!r.ok) {
    console.error(`  GET ${endpoint} -> ${r.status}`);
    return 0;
  }
  const list = await r.json();
  let ok = 0;
  for (const item of list) {
    const d = await fetch(`${BASE_URL}/api/${endpoint}/${item._id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    if (d.ok) ok++;
    else console.error(`  DELETE ${endpoint}/${item._id} -> ${d.status}`);
  }
  console.log(`  ${label}: removidos ${ok}/${list.length}`);
  return ok;
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
    console.error(`    upload ${path.basename(filePath)} -> ${res.status}`);
    return null;
  }
  return (await res.json()).url;
}

async function createCharacter(cookie, name, traits, cover, gallery) {
  const res = await fetch(`${BASE_URL}/api/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      name,
      description: "",
      traits,
      coverImageUrl: cover || undefined,
      gallery,
    }),
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

async function importAsCharacter(cookie, name, dir, traits) {
  const imgs = listImageFiles(dir);
  if (imgs.length === 0) {
    console.log(`  ${name}: sem imagens, pulando`);
    return null;
  }
  const urls = [];
  for (const f of imgs) {
    const u = await uploadImage(cookie, f);
    if (u) urls.push(u);
  }
  if (urls.length === 0) {
    console.log(`  ${name}: nenhum upload válido`);
    return null;
  }
  const [cover, ...rest] = urls;
  const r = await createCharacter(cookie, name, traits, cover, rest.slice(0, 20));
  if (r) console.log(`  ${name}: capa + ${Math.min(rest.length, 20)} galeria`);
  return r;
}

async function processFolder(cookie, folderName, folderPath, traits) {
  const files = listImageFiles(folderPath);
  const subs = listSubdirs(folderPath);

  if (files.length > 0) {
    await importAsCharacter(cookie, folderName, folderPath, traits);
    return;
  }

  if (subs.length === 0) {
    await importAsCharacter(cookie, folderName, folderPath, traits);
    return;
  }

  // Container: cada subpasta vira personagem com nome próprio
  for (const sub of subs) {
    const subName = normalizeName(sub.name);
    const looksRelated = subName.toLowerCase().includes(folderName.toLowerCase().slice(0, 4));
    const finalName = looksRelated ? subName : `${folderName} - ${subName}`;
    await importAsCharacter(cookie, finalName, path.join(folderPath, sub.name), traits);
  }
}

async function main() {
  console.log("Login admin...");
  const cookie = await login();
  if (!cookie.includes("session-token")) {
    console.error("Login falhou.");
    process.exit(1);
  }

  console.log("\n=== RESET ===");
  await wipe(cookie, "characters", "characters");
  await wipe(cookie, "history-cards", "history-cards");

  console.log("\n=== IMPORT PERSONAGENS RC (time) ===");
  for (const sub of listSubdirs(RC_ROOT)) {
    await processFolder(
      cookie,
      normalizeName(sub.name),
      path.join(RC_ROOT, sub.name),
      ["time RC"]
    );
  }

  console.log("\n=== IMPORT PERSONAGENS BÍBLICOS ===");
  for (const letra of listSubdirs(BIBLICOS_ROOT)) {
    const letraDir = path.join(BIBLICOS_ROOT, letra.name);
    for (const ch of listSubdirs(letraDir)) {
      await processFolder(
        cookie,
        normalizeName(ch.name),
        path.join(letraDir, ch.name),
        ["bíblico", "3-6 anos"]
      );
    }
  }

  console.log("\nFinalizado.");
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
