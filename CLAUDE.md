@AGENTS.md

# Agent Orchestration

## Available Agents (`.claude/agents/`)

| Agent | Model | Use Case |
|---|---|---|
| **fullstack** | Opus 4.6 | Features end-to-end, refatorações complexas, bugs multi-camada |
| **frontend** | Sonnet 4.5 | UI/UX, componentes, páginas, estilização, animações |
| **backend** | Sonnet 4.5 | API routes, models, auth, lógica de negócios |
| **corretor** | Haiku | Lint, typos, imports, formatação, correções simples |

## How to Invoke
```bash
# Agente frontend para task de UI
claude --agent frontend --dangerously-skip-permissions -p "crie a página de dashboard analytics"

# Agente backend para nova API
claude --agent backend --dangerously-skip-permissions -p "crie endpoint PATCH para atualizar assignments"

# Corretor para fixes rápidos
claude --agent corretor --dangerously-skip-permissions -p "corrija os erros de TypeScript em src/app/(dashboard)/escalas/page.tsx"

# Fullstack para feature completa
claude --agent fullstack --dangerously-skip-permissions -p "implemente sistema de favoritos: model, API, e UI"
```

## Orchestration Rules
- Opus (this conversation) orchestrates and delegates to agents
- Agents run in parallel when tasks are independent
- If Agent B depends on Agent A's output, run sequentially
- Always verify agent output before approving
