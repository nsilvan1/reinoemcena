# Reino em Cena — Agent Rules & Project Context

## Critical: Next.js 16 Breaking Changes
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Project Overview
**Reino em Cena** is a video production management system for a church ministry team. It manages a weekly content pipeline: Script → Recording → Editing → Review → Done.

- **Language**: Portuguese (pt-BR) — all UI text, variable names in domain context, comments
- **Target**: Mobile-first PWA for ministry volunteers

## Tech Stack
| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.2 |
| UI | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 + shadcn/ui v4 + tw-animate-css | 4.x |
| Auth | NextAuth.js (Credentials provider, JWT) | 4.24.x |
| Database | MongoDB Atlas + Mongoose | 9.4.x |
| Icons | lucide-react | 1.7.x |
| Dates | date-fns (locale ptBR) | 4.x |
| Toasts | sonner | 2.x |

## Architecture & Conventions

### Routing Structure
```
src/app/
├── layout.tsx              # Root layout (fonts, metadata, viewport)
├── globals.css             # Theme tokens (oklch), grain overlay, animations
├── (auth)/
│   ├── layout.tsx          # Passthrough layout
│   └── login/page.tsx      # Login page (dark cinematic theme)
├── (dashboard)/
│   ├── layout.tsx          # Auth guard + Sidebar + Providers + Toaster
│   ├── page.tsx            # Dashboard home
│   ├── escalas/            # Scales CRUD + detail with week tabs
│   ├── roteiros/           # Scripts CRUD + detail with assignments
│   ├── membros/            # User management (coordenador+)
│   ├── perfil/             # Self profile edit
│   └── notificacoes/       # Notification list
└── api/                    # REST API routes
```

### Page Pattern (ALL dashboard pages follow this)
```tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
// ... component imports

export default function PageName() {
  const { data: session } = useSession();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/endpoint").then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonUI />;  // Always provide skeleton loading state

  return (
    <div className="space-y-6">
      {/* Header with title + action button */}
      {/* Content with Card components */}
    </div>
  );
}
```

### API Route Pattern
```tsx
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Model from "@/models/Model";
import { requireAuth, requireRole } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  await connectDB();
  const items = await Model.find().populate("ref", "fields").sort({ field: -1 });
  return NextResponse.json(items);
}
```

### Key Rules
1. **Dynamic route params are Promises** — always `await params` before using:
   ```tsx
   export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
   ```
2. **Auth helpers return `{ error, user }`** — check error first, then use user
3. **Mongoose models use `mongoose.models.X || mongoose.model()`** pattern for HMR safety
4. **shadcn/ui v4** — components in `src/components/ui/`, import from `@/components/ui/xxx`
5. **No dark mode** — single warm cinematic light theme with dark sidebar
6. **Card styling**: `className="border-0 shadow-sm"` — no borders, subtle shadows
7. **Date formatting**: always use `date-fns` with `{ locale: ptBR }`

### Role Hierarchy
```
admin (4) > coordenador (3) > roteirista (2) > membro (1)
```
- **Admin**: full control
- **Coordenador**: manages scales, members under them
- **Roteirista**: creates/edits scripts, assigns narrators/editors
- **Membro**: views content, marks tasks complete

### Production Pipeline
```
📝 Roteiro → 🎙️ Gravação → 🎬 Edição → 👁️ Revisão → ✅ Concluído
```
Each phase auto-advances when ALL assigned members mark their task done. Review phase can reject back to any previous phase.

### Data Models
- **User**: name, username, password (bcrypt), role, skills (narrador|editor), managedBy
- **Scale**: title, month, weeks[] (number, theme, deadline, status, assignments{roteiristas, editores, narradores}, roteiro ref)
- **Roteiro**: title, content (HTML), fileUrl, scaleId, weekNumber, assignedEditors, assignedNarrators
- **TaskProgress**: scaleId, weekNumber, userId, role, completed, linkUrl (unique compound index)
- **Comment**: scaleId, weekNumber, userId, message, stage
- **Notification**: userId, message, type, read, link

### Color System (oklch)
- Primary: warm amber/gold `oklch(0.68 0.17 65)`
- Background: warm off-white `oklch(0.975 0.006 75)`
- Sidebar: dark cinematic `oklch(0.15 0.02 50)`
- Status colors: blue (roteiro), amber (gravacao), purple (edicao), orange (revisao), emerald (concluido)

### File Upload Pattern
- Roteiro uploads: PDF, Word, MP3, WAV (max 10MB) via FormData to `/api/roteiros/[id]/upload`
- Audio uploads: MP3, WAV, M4A, OGG, WebM (max 30MB) on scale detail page

### Notification System
- Created via `createNotification()` or `notifyMany()` from `@/lib/notifications`
- Auto-triggered on: assignment changes, phase transitions
- Polled client-side every 30s via `useNotifications` hook
- Types: escala, roteiro, status, revisao, geral

## Code Quality Standards
- TypeScript strict mode — no `@ts-ignore`
- Use `cn()` from `@/lib/utils` for conditional classes (clsx + tailwind-merge)
- Fetch responses always check `res.ok` before `.json()`
- Toast feedback: `toast.success()` / `toast.error()` from sonner
- Loading states: skeleton placeholders with `animate-pulse`
- Empty states: icon + text centered in Card
- Responsive: mobile-first, `lg:` breakpoint for desktop sidebar
