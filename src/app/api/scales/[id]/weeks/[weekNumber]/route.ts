import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import TaskProgress from "@/models/TaskProgress";
import Character from "@/models/Character";
import HistoryCard from "@/models/HistoryCard";
import { requireAuth } from "@/lib/auth-helpers";
import { isSafeUrl } from "@/lib/sanitize";
import { tryAdvanceWeek } from "@/lib/week-advance";
import { notifyMany } from "@/lib/notifications";
import { WeekStatus, ROLE_HIERARCHY, type Role } from "@/types";

type Params = { params: Promise<{ id: string; weekNumber: string }> };

const VALID_STATUSES: WeekStatus[] = ["roteiro", "gravacao", "edicao", "revisao", "concluido"];
const VALID_ROLES = ["roteirista", "narrador", "editor"] as const;
type ProgressRole = (typeof VALID_ROLES)[number];

// Campos que roteirista+ pode editar (referências do acervo).
// Demais campos exigem coordenador+.
const ROTEIRISTA_FIELDS = new Set(["historyCardId", "characterIds"]);

// PUT /api/scales/[id]/weeks/[weekNumber] — atualizar semana.
// - Coordenador+: qualquer campo
// - Roteirista: somente historyCardId/characterIds (vinculação de acervo)
export async function PUT(req: NextRequest, { params }: Params) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  await connectDB();
  const { id, weekNumber } = await params;
  const body = await req.json();
  const wNum = parseInt(weekNumber);

  const bodyKeys = Object.keys(body).filter((k) => body[k] !== undefined);
  const onlyAcervoFields = bodyKeys.length > 0 && bodyKeys.every((k) => ROTEIRISTA_FIELDS.has(k));
  const userLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;

  if (!onlyAcervoFields && userLevel < ROLE_HIERARCHY.coordenador) {
    return NextResponse.json({ error: "Permissão de coordenador necessária" }, { status: 403 });
  }
  if (onlyAcervoFields && userLevel < ROLE_HIERARCHY.roteirista) {
    return NextResponse.json({ error: "Permissão de roteirista necessária" }, { status: 403 });
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validações de referências do acervo antes de tocar a escala
  if (body.historyCardId !== undefined && body.historyCardId !== null) {
    if (!mongoose.isValidObjectId(body.historyCardId)) {
      return NextResponse.json({ error: "historyCardId inválido" }, { status: 400 });
    }
    const exists = await HistoryCard.exists({ _id: body.historyCardId });
    if (!exists) {
      return NextResponse.json({ error: "História não encontrada no acervo" }, { status: 404 });
    }
  }

  let characterIdsClean: string[] | undefined;
  if (body.characterIds !== undefined) {
    if (!Array.isArray(body.characterIds)) {
      return NextResponse.json({ error: "characterIds deve ser array" }, { status: 400 });
    }
    const valid = body.characterIds.filter(
      (cid: unknown) => typeof cid === "string" && mongoose.isValidObjectId(cid)
    ) as string[];
    if (valid.length > 20) {
      return NextResponse.json({ error: "Máximo 20 personagens por semana" }, { status: 400 });
    }
    if (valid.length > 0) {
      const existing = await Character.find({ _id: { $in: valid } }).select("_id").lean();
      const existingSet = new Set(existing.map((c: { _id: { toString(): string } }) => c._id.toString()));
      const missing = valid.filter((v) => !existingSet.has(v));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Personagens não encontrados: ${missing.join(", ")}` },
          { status: 404 }
        );
      }
    }
    characterIdsClean = valid;
  }

  const scale = await Scale.findById(id);
  if (!scale) return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });

  const weekIdx = scale.weeks.findIndex((w: { number: number }) => w.number === wNum);
  if (weekIdx === -1) return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });

  // Snapshot pré-save para detectar mudança em refs do acervo
  const prevHistoryId = scale.weeks[weekIdx].historyCardId?.toString();
  const prevCharIds = (scale.weeks[weekIdx].characterIds || [])
    .map((c: { toString(): string }) => c.toString())
    .sort()
    .join(",");

  if (body.theme !== undefined) scale.weeks[weekIdx].theme = body.theme;
  if (body.deadline !== undefined) scale.weeks[weekIdx].deadline = body.deadline;
  if (body.assignments !== undefined) scale.weeks[weekIdx].assignments = body.assignments;
  if (body.status !== undefined) scale.weeks[weekIdx].status = body.status;

  if (body.historyCardId !== undefined) {
    scale.weeks[weekIdx].historyCardId =
      body.historyCardId === null || body.historyCardId === "" ? undefined : body.historyCardId;
  }
  if (characterIdsClean !== undefined) {
    scale.weeks[weekIdx].characterIds = characterIdsClean;
  }

  await scale.save();

  // Notifica time da semana se houve mudança em refs do acervo
  const newHistoryId = scale.weeks[weekIdx].historyCardId?.toString();
  const newCharIds = (scale.weeks[weekIdx].characterIds || [])
    .map((c: { toString(): string }) => c.toString())
    .sort()
    .join(",");
  const historyChanged = prevHistoryId !== newHistoryId;
  const charactersChanged = prevCharIds !== newCharIds;

  if (historyChanged || charactersChanged) {
    const week = scale.weeks[weekIdx];
    const targetIds = new Set<string>([
      ...week.assignments.roteiristas.map((u: { toString(): string }) => u.toString()),
      ...week.assignments.narradores.map((u: { toString(): string }) => u.toString()),
      ...week.assignments.editores.map((u: { toString(): string }) => u.toString()),
    ]);
    targetIds.delete(user.id); // não notifica quem fez a mudança
    const userIds = Array.from(targetIds);
    if (userIds.length > 0) {
      const parts: string[] = [];
      if (historyChanged) parts.push(newHistoryId ? "história" : "história removida");
      if (charactersChanged) parts.push("personagens");
      const message = `Acervo da Semana ${wNum} "${week.theme}" foi atualizado (${parts.join(", ")})`;
      await notifyMany(userIds, message, "escala", `/escalas/${id}`).catch((err) => {
        console.error("[notifyMany acervo]", err);
      });
    }
  }

  return NextResponse.json(scale.weeks[weekIdx]);
}

// POST /api/scales/[id]/weeks/[weekNumber] — marcar progresso individual
export async function POST(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id, weekNumber } = await params;
  const body = await req.json();
  const wNum = parseInt(weekNumber);

  const role: ProgressRole = body.role;
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Papel inválido. Valores aceitos: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  if (body.linkUrl !== undefined && body.linkUrl !== null && body.linkUrl !== "") {
    if (typeof body.linkUrl !== "string" || !isSafeUrl(body.linkUrl)) {
      return NextResponse.json(
        { error: "linkUrl inválido (aceita http(s) ou caminho relativo /uploads/)" },
        { status: 400 }
      );
    }
  }

  const notes: string | undefined =
    body.notes !== undefined ? String(body.notes).trim().slice(0, 2000) : undefined;

  const scale = await Scale.findById(id);
  if (!scale) return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });

  const week = scale.weeks.find((w: { number: number }) => w.number === wNum);
  if (!week) return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });

  // Verificar se o usuário está atribuído ao papel informado
  const assignmentKey = role === "roteirista" ? "roteiristas" : role === "narrador" ? "narradores" : "editores";
  const assignedIds: string[] = week.assignments[assignmentKey].map((uid: { toString(): string }) => uid.toString());

  if (!assignedIds.includes(user.id)) {
    return NextResponse.json({ error: "Você não está atribuído a este papel nesta semana" }, { status: 403 });
  }

  // Roteirista só pode concluir se existe roteiro vinculado
  if (role === "roteirista" && !week.roteiro) {
    return NextResponse.json({ error: "Crie e vincule um roteiro antes de concluir" }, { status: 400 });
  }

  const session = await mongoose.startSession();
  let progress: unknown;

  try {
    await session.withTransaction(async () => {
      progress = await TaskProgress.findOneAndUpdate(
        { scaleId: id, weekNumber: wNum, userId: user.id, role },
        {
          completed: body.completed ?? true,
          completedAt: body.completed !== false ? new Date() : undefined,
          notes,
          linkUrl: body.linkUrl,
        },
        { upsert: true, new: true, session }
      );

      if (body.completed !== false) {
        await tryAdvanceWeek(id, wNum, session);
      }
    });
  } catch (err: unknown) {
    await session.endSession();
    console.error("[POST /api/scales/[id]/weeks/[weekNumber]]", err);
    return NextResponse.json({ error: "Erro interno ao registrar progresso" }, { status: 500 });
  }

  await session.endSession();
  return NextResponse.json(progress);
}
