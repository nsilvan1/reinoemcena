import { ROLE_HIERARCHY, type Role } from "@/types";
import type { TourStep } from "@/components/guided-tour";

/**
 * Passos do tour guiado, adaptados ao papel do usuário.
 *
 * Os `target` referenciam atributos data-tour="..." presentes na sidebar
 * (sempre renderizada no dashboard) e no painel do Acervo. Passos sem target
 * viram cards centrais (boas-vindas, pipeline, encerramento).
 */
export function getTourSteps(role: Role): TourStep[] {
  const level = ROLE_HIERARCHY[role] ?? 1;
  const isRoteiristaPlus = level >= ROLE_HIERARCHY.roteirista;
  const isCoordPlus = level >= ROLE_HIERARCHY.coordenador;
  const isAdmin = level >= ROLE_HIERARCHY.admin;

  const steps: TourStep[] = [];

  // 1. Boas-vindas
  steps.push({
    id: "welcome",
    title: "Bem-vindo ao Reino em Cena 🎬",
    body: "Em menos de um minuto eu te mostro onde fica cada coisa e como o trabalho flui por aqui. Use as setas ← → ou os botões.",
  });

  // 2. Pipeline (central)
  steps.push({
    id: "pipeline",
    title: "O caminho de cada vídeo",
    body: "Toda semana percorre 5 fases: 📝 Roteiro → 🎙️ Gravação → 🎬 Edição → 👁️ Revisão → ✅ Concluído. A fase avança sozinha quando todos os responsáveis terminam a parte deles.",
  });

  // 3. Dashboard
  steps.push({
    id: "dashboard",
    target: "nav-dashboard",
    title: "Sua central",
    body: "O Dashboard reúne o que precisa da sua atenção: tarefas pendentes, revisões e o andamento da semana num relance.",
  });

  // 4. Escalas (texto por papel)
  steps.push({
    id: "escalas",
    target: "nav-escalas",
    title: "Escalas — os meses de produção",
    body: isCoordPlus
      ? "Aqui você monta os meses: cria semanas com tema e prazo e atribui roteiristas, narradores e editores em cada uma."
      : isRoteiristaPlus
        ? "Cada escala é um mês. Abra uma semana para escrever o roteiro, ver as referências do acervo e atribuir quem grava e edita."
        : "Cada escala é um mês com várias semanas. Abra a sua semana para ver o tema, o prazo e marcar a sua tarefa como feita.",
  });

  // 5. Roteiros
  steps.push({
    id: "roteiros",
    target: "nav-roteiros",
    title: "Roteiros",
    body: isRoteiristaPlus
      ? "Escreva e edite roteiros direto no editor, importe texto de PDF/DOCX e atribua narradores e editores. O histórico de versões fica guardado."
      : "Os roteiros de cada semana ficam aqui para você consultar antes de gravar ou editar.",
  });

  // 6. Acervo
  steps.push({
    id: "acervo",
    target: "nav-acervo",
    title: "Acervo — banco visual",
    body: "Personagens (com galeria de imagens) e Histórias reutilizáveis. Você vincula esse material às semanas e filtra por tags para achar rápido.",
  });

  // 7. Drive (só admin) — destaca o painel de sincronização no Acervo
  if (isAdmin) {
    steps.push({
      id: "drive",
      target: "drive-sync",
      route: "/acervo",
      title: "Sincronização com o Google Drive",
      body: "Como admin, você conecta a conta do Google Drive do ministério aqui. Ao sincronizar, cada pasta com imagens vira um personagem automaticamente — e o acervo fica sempre atualizado.",
    });
  }

  // 8. Membros (só coordenador+)
  if (isCoordPlus) {
    steps.push({
      id: "membros",
      target: "nav-membros",
      title: "Membros do time",
      body: "Gerencie quem faz parte da equipe, os papéis (roteirista, narrador, editor) e quem você coordena.",
    });
  }

  // 9. Notificações
  steps.push({
    id: "notificacoes",
    target: "nav-notificacoes",
    title: "Fique por dentro",
    body: "Atribuições, mudanças de fase e revisões chegam aqui. O número vermelho mostra quantas você ainda não viu — atualiza sozinho a cada 30s.",
  });

  // 10. Perfil
  steps.push({
    id: "perfil",
    target: "perfil",
    title: "Seu perfil",
    body: "Toque aqui para ajustar seus dados e habilidades, ou sair da conta.",
  });

  // 11. Ajuda
  steps.push({
    id: "ajuda",
    target: "nav-ajuda",
    title: "Precisou de ajuda?",
    body: "A página de Ajuda tem o FAQ completo — e você pode reabrir este tour por lá sempre que quiser.",
  });

  // 12. Encerramento
  steps.push({
    id: "done",
    title: "Tudo pronto! 🙌",
    body: isCoordPlus
      ? "Já dá pra começar: crie uma escala, monte as semanas e atribua o time. Bom trabalho!"
      : isRoteiristaPlus
        ? "Já dá pra começar: confira suas semanas e mãos à obra no roteiro. Bom trabalho!"
        : "Já dá pra começar: veja suas tarefas no Dashboard e marque o que concluir. Bom trabalho!",
  });

  return steps;
}
