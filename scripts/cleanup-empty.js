// Remove personagens sem coverImageUrl (importados em modo "vazio")
const BASE_URL = "http://localhost:3000";

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

(async () => {
  const cookie = await login();
  const r = await fetch(`${BASE_URL}/api/characters`, { headers: { cookie } });
  const list = await r.json();
  const empty = list.filter((c) => !c.coverImageUrl);
  console.log(`A remover: ${empty.length}`, empty.map((c) => c.name));
  for (const c of empty) {
    const d = await fetch(`${BASE_URL}/api/characters/${c._id}`, { method: "DELETE", headers: { cookie } });
    console.log(`  ${c.name} -> ${d.status}`);
  }
})();
