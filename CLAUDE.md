@AGENTS.md

# Agent Orchestration

## Available Agents (`.claude/agents/`)

### Implementação
| Agent | Model | Use Case |
|---|---|---|
| **fullstack** | Opus 4.6 | Features end-to-end, refatorações complexas, bugs multi-camada |
| **frontend** | Sonnet 4.5 | UI/UX, componentes, páginas, estilização, animações |
| **backend** | Sonnet 4.5 | API routes, models, auth, lógica de negócios |
| **corretor** | Haiku | Lint, typos, imports, formatação, correções simples |

### Qualidade & Dados & Segurança
| Agent | Model | Use Case |
|---|---|---|
| **reviewer** | Sonnet 4.5 (1M) | Auditoria pós-código: tipos, padrões, auth helpers, anti-padrões, antes do merge |
| **dbops** | Sonnet 4.5 (1M) | Mongoose puro: schemas, índices, seeds, migrations, agregações, populate aninhado |
| **security** | Opus 4.7 | Auditoria de segurança: OWASP, sanitização TipTap, escopo coordenador, exposição password |

## How to Invoke
```bash
# === IMPLEMENTAÇÃO ===
# Frontend para task de UI
claude --agent frontend --dangerously-skip-permissions -p "crie a página de dashboard analytics"

# Backend para nova API
claude --agent backend --dangerously-skip-permissions -p "crie endpoint PATCH para atualizar assignments"

# Corretor para fixes rápidos
claude --agent corretor --dangerously-skip-permissions -p "corrija erros de TypeScript em src/app/(dashboard)/escalas/page.tsx"

# Fullstack para feature completa
claude --agent fullstack --dangerously-skip-permissions -p "implemente sistema de favoritos: model, API, e UI"

# === QUALIDADE & DADOS & SEGURANÇA ===
# Reviewer auditando mudanças recentes
claude --agent reviewer --dangerously-skip-permissions -p "revise os arquivos alterados em src/app/api/roteiros/ contra o checklist de backend"

# DBOps criando índice + migration
claude --agent dbops --dangerously-skip-permissions -p "adicione índice composto em Notification { userId, createdAt: -1 } e crie migration idempotente"

# Security auditando feature sensível
claude --agent security --dangerously-skip-permissions -p "audite o fluxo de upload em /api/roteiros/[id]/upload contra OWASP A04 e A08"
```

## Orchestration Rules

### Pipeline padrão para feature nova
1. **Orquestrador (Opus 4.6)** planeja e divide a tarefa
2. **backend** + **frontend** OU **fullstack** implementam (paralelo se áreas independentes)
3. **dbops** entra se a feature mexe em schema/índice/seed (geralmente antes do backend)
4. **reviewer** audita o output (paralelo a outros agentes se mexerem em áreas diferentes)
5. **security** entra em features sensíveis (auth, upload, permissões, conteúdo HTML) ou pré-release
6. **corretor** finaliza ajustes triviais (lint, imports)

### Quando rodar em paralelo
- `frontend` (página) + `backend` (API) — contratos definidos antes pelo orquestrador
- `reviewer` (auditando feature A) + `backend` (escrevendo feature B) — áreas independentes
- `security` (auditoria de release) + `dbops` (criando índice em outro model)

### Quando serializar
- `dbops` cria schema/índice → depois `backend` consome
- `backend`/`frontend` implementam → depois `reviewer` audita o diff
- `reviewer` aponta bloqueador → o agente original corrige → re-audita

### Regras de ouro
- Opus 4.6 (esta conversa) orquestra; não codifica feature — delega
- Sempre verificar output do agente antes de aprovar (ler arquivos modificados, não confiar no resumo)
- `reviewer` e `security` NÃO escrevem feature — apenas reportam achados
- Para tarefa < 5min e baixa complexidade, prefira `corretor` (Haiku) — economia de tokens
- Modelos: Opus 4.7 só para `security` e tarefas críticas; Sonnet 4.5 1M para auditoria/DB; Haiku para trivial
