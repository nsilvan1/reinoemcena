"use client";

import { useMemo, useState } from "react";
import {
  HelpCircle,
  PenLine,
  Mic,
  Film,
  Eye,
  CircleCheck,
  Calendar,
  Images,
  Bell,
  Users,
  Search,
  Smartphone,
  KeyRound,
  Shield,
  ChevronDown,
  PlayCircle,
  Sparkles,
  Drama,
  BookOpen,
  Clapperboard,
  Upload,
  MessageCircle,
  X,
} from "lucide-react";
import { Button, Input, PageHeader } from "@/components/v2/primitives";
import { cn } from "@/lib/utils";
import { WelcomeTutorialModal, resetTutorial } from "@/components/welcome-tutorial-modal";
import { startGuidedTour } from "@/components/guided-tour-launcher";

interface FaqItem {
  q: string;
  a: React.ReactNode;
  tags?: string[];
}

interface FaqSection {
  id: string;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  hue: string;
  intro?: string;
  items: FaqItem[];
}

const SECTIONS: FaqSection[] = [
  {
    id: "comecar",
    title: "Começando",
    icon: Sparkles,
    hue: "158",
    intro: "O básico para se localizar no sistema.",
    items: [
      {
        q: "O que é o Reino em Cena?",
        a: "Plataforma de produção de vídeos do ministério. Organiza o fluxo semanal de cada episódio, desde a escrita do roteiro até a entrega final, com o time inteiro acompanhando cada etapa.",
        tags: ["visão geral"],
      },
      {
        q: "Como faço login?",
        a: "Use seu nome de usuário (ex.: lari, thays, sarah) e a senha. Marque “Lembrar usuário” se for um dispositivo seu, que ele guarda o login no navegador.",
        tags: ["login", "senha"],
      },
      {
        q: "Quais papéis existem?",
        a: (
          <ul className="space-y-1.5 text-[13px]">
            <li>
              <strong className="text-[oklch(0.86_0.14_25)]">Admin</strong> · controle total.
            </li>
            <li>
              <strong className="text-[oklch(0.86_0.14_220)]">Coordenador</strong> · cria
              escalas, gerencia membros, aprova revisões.
            </li>
            <li>
              <strong className="text-[oklch(0.86_0.14_300)]">Roteirista</strong> · cria/edita
              roteiros e atribui narradores e editores.
            </li>
            <li>
              <strong className="text-[oklch(0.86_0.14_60)]">Membro</strong> · participa como
              narrador, editor ou revisor, conforme a habilidade.
            </li>
          </ul>
        ),
        tags: ["papéis", "permissões"],
      },
      {
        q: "Como saber em qual semana ou tarefa estou?",
        a: "O Dashboard mostra um “Hero” no topo com o que está esperando você (revisar, gravar, escrever). Logo abaixo, a distribuição das semanas pela pipeline.",
        tags: ["dashboard"],
      },
      {
        q: "Posso instalar como app no celular?",
        a: "Sim. Abra o site no Chrome (Android) ou Safari (iOS) e use “Adicionar à tela inicial”. O app abre em tela cheia, com ícone próprio, e funciona offline para o que já carregou.",
        tags: ["PWA", "mobile"],
      },
    ],
  },
  {
    id: "pipeline",
    title: "Pipeline de produção",
    icon: PlayCircle,
    hue: "158",
    intro:
      "Cada semana percorre 5 fases. A próxima começa quando todos atribuídos terminam a sua parte.",
    items: [
      {
        q: "Quais são as 5 fases?",
        a: (
          <div className="space-y-2">
            <StageRow icon={PenLine} hue="220" name="Roteiro">
              Roteirista escreve ou anexa o roteiro (HTML, PDF, Word) e marca como concluído.
            </StageRow>
            <StageRow icon={Mic} hue="60" name="Gravação">
              Narradores gravam in-browser ou anexam áudio (MP3/WAV/M4A/OGG/WebM, até 30 MB).
            </StageRow>
            <StageRow icon={Film} hue="300" name="Edição">
              Editores enviam cortes em vídeo e podem importar imagens do acervo.
            </StageRow>
            <StageRow icon={Eye} hue="25" name="Revisão">
              Coordenador cola o link final (YouTube/Drive/MP4) e aprova ou rejeita com
              apontamentos.
            </StageRow>
            <StageRow icon={CircleCheck} hue="158" name="Concluído">
              Semana finalizada. Tudo fica arquivado para consulta.
            </StageRow>
          </div>
        ),
      },
      {
        q: "Por que minha semana não avançou de fase?",
        a: "A fase só avança quando todos os atribuídos àquele papel concluem. Veja na seção “Equipe & Progresso” quem ainda está pendente. Coordenadores podem forçar o avanço com confirmação.",
      },
      {
        q: "Posso voltar uma fase?",
        a: "Sim, na fase de Revisão. Clique em “Rejeitar com apontamentos”, escreva o motivo e escolha para qual fase voltar (Roteiro, Gravação ou Edição). O motivo vira comentário no chat para histórico.",
      },
    ],
  },
  {
    id: "escalas",
    title: "Escalas",
    icon: Calendar,
    hue: "220",
    intro: "A escala é o mês. Dentro dela ficam as semanas com tema, prazo e equipe.",
    items: [
      {
        q: "Como criar uma escala?",
        a: 'Coordenador+ clica em “Nova escala” em /escalas. Define título, mês (YYYY-MM) e as semanas (tema + prazo). Pode adicionar quantas semanas quiser, mínimo 1.',
      },
      {
        q: "Como atribuir equipe a uma semana?",
        a: "Abra a semana e configure roteiristas, narradores e editores. Apenas usuários com a habilidade correta (skill narrador/editor) aparecem nas opções respectivas.",
      },
      {
        q: "O que é o painel de Referências?",
        a: "É onde você vincula a história e os personagens do Acervo a essa semana. Útil para o roteirista lembrar contexto e o editor saber que imagens usar.",
      },
      {
        q: "Para que serve o chat lateral?",
        a: "Comentários por fase. Cada mensagem fica marcada com a fase em que foi escrita (Roteiro, Gravação, Edição, Revisão, Geral). Roda em tempo real para a equipe da semana.",
      },
    ],
  },
  {
    id: "roteiros",
    title: "Roteiros",
    icon: PenLine,
    hue: "220",
    intro: "Onde o conteúdo escrito da semana ganha forma.",
    items: [
      {
        q: "Como crio um roteiro?",
        a: 'Na fase Roteiro de uma semana, clique em “Escrever roteiro agora”. Abre um editor TipTap com formatação rica (títulos, listas, negrito, citações). Ao salvar, o roteiro fica vinculado à semana.',
      },
      {
        q: "Posso anexar um arquivo no lugar?",
        a: "Pode. Aceita PDF, DOC, DOCX, MP3 e WAV até 10 MB. O sistema mostra o PDF embedado e oferece download de Word. Você pode coexistir conteúdo escrito + anexo na mesma semana.",
      },
      {
        q: "Onde vejo o roteiro depois?",
        a: 'Na semana, expanda “CONTEÚDO ESCRITO” para preview formatado. Botões “Página” abre o roteiro completo em /roteiros/[id], e “Editar” reabre o editor TipTap inline.',
      },
      {
        q: "Tem histórico de versões?",
        a: 'Sim. Em /roteiros/[id] tem o botão “Histórico” no topo. Cada salvamento gera uma versão que pode ser restaurada pelo autor ou coordenador+.',
      },
    ],
  },
  {
    id: "gravacao",
    title: "Gravação",
    icon: Mic,
    hue: "60",
    intro: "Cada narrador entrega sua tomada — pelo navegador ou anexando arquivo.",
    items: [
      {
        q: "Como gravar pelo próprio sistema?",
        a: 'Como narrador da semana, abra a fase Gravação e clique em “Gravar agora”. O navegador pede permissão de microfone. Use Pausar/Continuar/Parar e ouça o preview antes de salvar.',
      },
      {
        q: "E se eu quiser anexar um áudio que já gravei?",
        a: 'Use “Anexar arquivo existente”. Aceita MP3, WAV, M4A, OGG e WebM, até 30 MB. Mesmo formato salvo no histórico.',
      },
      {
        q: "Tem como ouvir as tomadas dos outros?",
        a: "Sim. Quando a semana está em Gravação, o painel mostra cada narrador com player HTML5 inline. Para fases já passadas, clique em “GRAVAÇÃO” no pipeline visual da semana para visualizar.",
      },
      {
        q: "Posso refazer minha gravação?",
        a: "Pode. A última tomada substitui o linkUrl no seu TaskProgress. O arquivo antigo continua salvo como referência caso precise voltar.",
      },
    ],
  },
  {
    id: "edicao",
    title: "Edição",
    icon: Film,
    hue: "300",
    intro: "Editores recebem o roteiro e os áudios, montam o vídeo, podem usar o acervo visual.",
    items: [
      {
        q: "Como envio meu corte?",
        a: 'Na fase Edição, use o uploader para enviar o arquivo de vídeo (MP4, WebM, MOV). Adicione notas opcionais e marque como concluído.',
      },
      {
        q: "Como pego imagens do Acervo?",
        a: 'Clique em “Adicionar mídia (Acervo ou upload)”. Tab “Acervo” lista personagens com galeria — selecione e importe. Tab “Upload” envia imagem nova e oferece a opção de salvar também no acervo com nome, traits e descrição.',
      },
      {
        q: "Quem pode aprovar a edição?",
        a: "Os próprios editores marcam concluído individualmente. Quando todos terminam, a semana avança para Revisão automaticamente.",
      },
    ],
  },
  {
    id: "revisao",
    title: "Revisão",
    icon: Eye,
    hue: "25",
    intro:
      "Última checagem antes de publicar. Coordenador analisa o vídeo final e decide: aprovar ou rejeitar.",
    items: [
      {
        q: "Onde colo o link do vídeo final?",
        a: 'No painel “LINK DO VÍDEO FINAL” da fase Revisão. Cola URL do YouTube, do Drive (formato /file/d/ID/view ou open?id=) ou um MP4/WebM/MOV direto. O sistema reconhece e gera o embed automaticamente.',
      },
      {
        q: "Como aprovar?",
        a: 'Botão grande verde “Aprovar e concluir”. A semana vai direto para Concluído e todos os atribuídos são notificados.',
      },
      {
        q: "E se precisar de ajustes?",
        a: 'Botão laranja “Rejeitar com apontamentos”. Escreva o motivo (obrigatório) e escolha para qual fase voltar. O motivo vira comentário visível para toda a equipe.',
      },
      {
        q: "Editores podem aprovar a edição também?",
        a: "Sim, cada editor pode aprovar individualmente sua parte ou pedir ajuste. O fluxo de aprovação final, porém, é responsabilidade do coordenador.",
      },
    ],
  },
  {
    id: "acervo",
    title: "Acervo",
    icon: Images,
    hue: "300",
    intro: "Banco visual reutilizável: personagens com galeria e histórias com cards.",
    items: [
      {
        q: "O que diferencia Personagem de História?",
        a: (
          <div className="space-y-2 text-[13px]">
            <p className="flex items-start gap-2">
              <Drama className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[oklch(0.85_0.14_158)]" />
              <span>
                <strong>Personagem</strong> — capa + galeria de até 20 imagens. Ex.: Bru,
                Davi, Anjo.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[oklch(0.85_0.14_158)]" />
              <span>
                <strong>História</strong> — card temático com anexos opcionais. Ex.: Páscoa,
                Grande Comissão.
              </span>
            </p>
          </div>
        ),
      },
      {
        q: "Como filtrar?",
        a: "No topo do Acervo, chips clicáveis por trait (ex.: #time RC, #bíblico) e ordenação A→Z / Z→A / Recentes. Toggle “Com galeria” / “Com anexos” afina ainda mais.",
      },
      {
        q: "Quem pode criar/editar?",
        a: "Roteirista+. Membros têm acesso de leitura.",
      },
      {
        q: "Como vejo a galeria de um personagem?",
        a: 'Clique no card → abre o sheet lateral com capa, traits e thumbs da galeria. Toque numa imagem para abrir em tela cheia (lightbox com setas e download).',
      },
    ],
  },
  {
    id: "notificacoes",
    title: "Notificações",
    icon: Bell,
    hue: "25",
    intro: "Fique por dentro do que muda no fluxo.",
    items: [
      {
        q: "Quando recebo notificação?",
        a: "Em atribuições novas, mudanças de fase, rejeições e edições do acervo da semana. O badge vermelho no sino mostra o número não lido.",
      },
      {
        q: "Frequência de atualização?",
        a: "Polling a cada 30 segundos. Em background o app continua escutando enquanto a aba está aberta.",
      },
      {
        q: "Como marco como lido?",
        a: 'Abra a tela /notificacoes ou clique numa notificação — ela leva ao item relacionado e marca como lido automaticamente.',
      },
    ],
  },
  {
    id: "membros",
    title: "Membros",
    icon: Users,
    hue: "220",
    intro: "Gestão do time. Acesso restrito.",
    items: [
      {
        q: "Quem vê /membros?",
        a: "Coordenador+. Listagem do time com papel, habilidades e gestor.",
      },
      {
        q: "Como definir habilidades?",
        a: 'Edite o membro e marque as skills “narrador” e/ou “editor”. Só quem tiver a skill correspondente pode ser atribuído à semana naquele papel.',
      },
      {
        q: "Posso adicionar membro novo?",
        a: "Admin pode. Use o botão “Novo membro”. Senha padrão é 123456 — peça para a pessoa trocar no primeiro acesso pelo Perfil.",
      },
    ],
  },
  {
    id: "atalhos",
    title: "Atalhos e produtividade",
    icon: KeyRound,
    hue: "158",
    items: [
      {
        q: "Quais teclas de atalho existem?",
        a: (
          <ul className="space-y-1.5 text-[13px]">
            <li>
              <Kbd>⌘K</Kbd> · busca rápida (em desenvolvimento)
            </li>
            <li>
              <Kbd>G</Kbd> <Kbd>D</Kbd> · ir para Dashboard
            </li>
            <li>
              <Kbd>G</Kbd> <Kbd>E</Kbd> · Escalas
            </li>
            <li>
              <Kbd>G</Kbd> <Kbd>R</Kbd> · Roteiros
            </li>
            <li>
              <Kbd>G</Kbd> <Kbd>A</Kbd> · Acervo
            </li>
            <li>
              <Kbd>G</Kbd> <Kbd>N</Kbd> · Notificações
            </li>
            <li>
              <Kbd>Esc</Kbd> · fecha modais e lightbox
            </li>
            <li>
              <Kbd>←</Kbd> <Kbd>→</Kbd> · navega no lightbox e no tutorial
            </li>
          </ul>
        ),
      },
      {
        q: "Como pesquisar um personagem rapidamente?",
        a: 'Abra /acervo, use o campo de busca à direita. Pesquisa por nome e por traits. Resultados aparecem em tempo real (debounce 300ms).',
      },
    ],
  },
  {
    id: "pwa",
    title: "Instalar como app (PWA)",
    icon: Smartphone,
    hue: "300",
    items: [
      {
        q: "Como instalar no Android?",
        a: 'Chrome → menu “⋮” → “Instalar app” ou “Adicionar à tela inicial”. O ícone do Reino em Cena aparece como app nativo, abre sem barra do navegador.',
      },
      {
        q: "E no iPhone?",
        a: 'Safari → botão de compartilhar → “Adicionar à Tela de Início”. iOS mostra o ícone com nome editável e o app abre em tela cheia.',
      },
      {
        q: "Funciona offline?",
        a: "Páginas já visitadas ficam em cache para abrir mesmo sem rede. Ações como upload e marcar concluído exigem conexão.",
      },
    ],
  },
  {
    id: "seguranca",
    title: "Privacidade e segurança",
    icon: Shield,
    hue: "158",
    items: [
      {
        q: "Onde os arquivos ficam?",
        a: "Áudios, vídeos e imagens ficam no servidor em /uploads/. As URLs são privadas — só usuários autenticados conseguem acessar via app.",
      },
      {
        q: "Quem vê o quê?",
        a: "Cada papel só vê o que precisa. Coordenador vê todas as escalas; roteirista vê o que cria; membros veem onde estão atribuídos. Senhas são guardadas em bcrypt.",
      },
      {
        q: "Como troco minha senha?",
        a: 'Perfil → campo de nova senha → salvar. Saia e entre de novo para testar.',
      },
    ],
  },
];

export default function AjudaPage() {
  const [query, setQuery] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set([SECTIONS[0].id, SECTIONS[1].id])
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((it) => {
        const text =
          (it.q + " " + extractText(it.a) + " " + (it.tags || []).join(" ")).toLowerCase();
        return text.includes(q);
      }),
    })).filter((s) => s.items.length > 0);
  }, [q]);

  function toggle(id: string) {
    setOpenSections((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function openTutorial() {
    resetTutorial();
    setTutorialOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ajuda"
        title="Como usar o sistema"
        description="FAQ completo, com tutorial inicial e atalhos. Tudo num só lugar."
        icon={HelpCircle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openTutorial}>
              <PlayCircle className="h-3.5 w-3.5" />
              Ver tutorial
            </Button>
            <Button onClick={startGuidedTour}>
              <Sparkles className="h-3.5 w-3.5" />
              Tour guiado
            </Button>
          </div>
        }
      />

      {/* Busca */}
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar na FAQ… ex: gravar, revisão, acervo"
          leading={<Search className="h-3.5 w-3.5" />}
          trailing={
            query ? (
              <button
                onClick={() => setQuery("")}
                className="h-6 w-6 rounded-md hover:bg-[oklch(0.255_0.016_170)] flex items-center justify-center"
                aria-label="Limpar busca"
              >
                <X className="h-3 w-3 text-muted-foreground/65" />
              </button>
            ) : null
          }
        />
      </div>

      {/* Atalho de seções */}
      {!q && (
        <nav className="flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium border border-border bg-[oklch(0.225_0.015_170)] text-muted-foreground hover:text-foreground hover:border-[oklch(0.36_0.020_168)] transition-colors"
            >
              <s.icon
                className="h-3 w-3"
                style={{ color: `oklch(0.80 0.14 ${s.hue})` }}
                strokeWidth={1.8}
              />
              {s.title}
            </a>
          ))}
        </nav>
      )}

      {/* Seções */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 space-y-2 border-2 border-dashed rounded-xl bg-muted/30">
            <Search className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Nenhum resultado para “{query}”
            </p>
          </div>
        )}

        {filtered.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="rounded-xl border border-border bg-[oklch(0.200_0.016_172)] overflow-hidden scroll-mt-20"
          >
            <button
              type="button"
              onClick={() => toggle(s.id)}
              className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-[oklch(0.22_0.016_172)] transition-colors text-left"
            >
              <span
                className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border"
                style={{
                  background: `oklch(0.22 0.040 ${s.hue})`,
                  borderColor: `oklch(0.36 0.08 ${s.hue})`,
                }}
              >
                <s.icon
                  className="h-4 w-4"
                  style={{ color: `oklch(0.85 0.14 ${s.hue})` }}
                  strokeWidth={1.8}
                />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="font-heading text-lg font-semibold leading-tight">
                  {s.title}
                </h2>
                {s.intro && (
                  <p className="text-[12px] text-muted-foreground/70 mt-0.5">
                    {s.intro}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground/55">
                {s.items.length}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground/60 transition-transform",
                  (openSections.has(s.id) || !!q) && "rotate-180"
                )}
              />
            </button>

            {(openSections.has(s.id) || !!q) && (
              <div className="border-t border-border divide-y divide-border">
                {s.items.map((it, i) => (
                  <FaqItemBlock key={i} q={it.q} a={it.a} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Bloco final */}
      <div className="rounded-xl border border-dashed border-[oklch(0.40_0.08_158)] bg-[oklch(0.22_0.030_158)]/40 p-5 flex items-start gap-4">
        <span className="shrink-0 h-10 w-10 rounded-xl bg-[oklch(0.22_0.040_158)] border border-[oklch(0.40_0.08_158)] flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-[oklch(0.85_0.14_158)]" strokeWidth={1.8} />
        </span>
        <div>
          <p className="font-heading text-base font-semibold">Não achou o que precisa?</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            Fale com o coordenador do ministério ou abra um comentário direto na semana
            correspondente. A equipe acompanha por lá.
          </p>
        </div>
      </div>

      <WelcomeTutorialModal open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </div>
  );
}

function FaqItemBlock({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-[oklch(0.22_0.016_172)] transition-colors"
      >
        <span className="flex-1 text-[13.5px] font-medium">{q}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/55 transition-transform shrink-0",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="px-4 sm:px-6 pb-4 pt-1 text-[13px] leading-relaxed text-muted-foreground">
          {a}
        </div>
      )}
    </div>
  );
}

function StageRow({
  icon: Icon,
  hue,
  name,
  children,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  hue: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-[oklch(0.205_0.016_172)]">
      <span
        className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center border"
        style={{
          background: `oklch(0.22 0.040 ${hue})`,
          borderColor: `oklch(0.36 0.08 ${hue})`,
        }}
      >
        <Icon
          className="h-3.5 w-3.5"
          style={{ color: `oklch(0.85 0.14 ${hue})` }}
          strokeWidth={1.8}
        />
      </span>
      <div className="text-[13px]">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.18em] mb-0.5"
          style={{ color: `oklch(0.80 0.14 ${hue})` }}
        >
          {name}
        </p>
        {children}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="kbd">{children}</span>;
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}
