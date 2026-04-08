export type Role = "admin" | "coordenador" | "roteirista" | "membro";

export type Skill = "narrador" | "editor";

export type WeekStatus = "roteiro" | "gravacao" | "edicao" | "revisao" | "concluido";

export const WEEK_STATUS_LABELS: Record<WeekStatus, string> = {
  roteiro: "Roteiro",
  gravacao: "Gravação",
  edicao: "Edição",
  revisao: "Revisão",
  concluido: "Concluído",
};

export const WEEK_STATUS_ICONS: Record<WeekStatus, string> = {
  roteiro: "📝",
  gravacao: "🎙️",
  edicao: "🎬",
  revisao: "👁️",
  concluido: "✅",
};

export const WEEK_STATUS_ORDER: WeekStatus[] = [
  "roteiro",
  "gravacao",
  "edicao",
  "revisao",
  "concluido",
];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  coordenador: "Coordenador",
  roteirista: "Roteirista",
  membro: "Membro",
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 4,
  coordenador: 3,
  roteirista: 2,
  membro: 1,
};
