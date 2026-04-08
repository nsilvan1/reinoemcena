# Reino em Cena — Design do Sistema

## Stack
- Next.js 16 (App Router) + TypeScript
- NextAuth.js (Credentials)
- MongoDB Atlas + Mongoose
- Tailwind CSS + shadcn/ui
- PWA (manifest.json)
- Deploy: Vercel

## Papéis
| Papel | Nível |
|---|---|
| Admin | 4 — controle total |
| Coordenador | 3 — escalas + membros abaixo |
| Roteirista | 2 — edita roteiros + atribui equipe |
| Membro | 1 — visualiza + marca tarefa |

## Pipeline de Produção
```
📝 Roteiro → 🎙️ Gravação → 🎬 Edição → 👁️ Revisão → ✅ Concluído
```

- Cada fase avança quando TODOS os membros marcam sua parte
- Revisão pode reprovar e voltar fases
- Upload direto: roteiros (PDF/Word) e áudios (MP3/WAV)
- Link externo: vídeos editados (Drive, etc.)

## Modelo de Dados
- User (name, email, password, role, skills, managedBy)
- Scale (title, month, weeks[])
- Roteiro (title, content, fileUrl, scaleId, weekNumber, assignedEditors, assignedNarrators)
- Notification (userId, message, type, read, link)
- TaskProgress (scaleId, weekNumber, userId, role, completed, linkUrl)

## Credenciais Seed
- Admin: admin@reinoemcena.com / admin123
- Membros: todos com senha 123456
- POST /api/seed para criar dados iniciais
