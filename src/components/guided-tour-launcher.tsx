"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { GuidedTour } from "./guided-tour";
import { getTourSteps } from "@/lib/tour-steps";
import { hasSeenTutorial } from "./welcome-tutorial-modal";
import type { Role } from "@/types";

const GUIDED_KEY = "reinoemcena.guidedtour.v1";
const START_EVENT = "reinoemcena:start-tour";

/** Dispara o tour guiado de qualquer lugar (ex.: botão na Ajuda). */
export function startGuidedTour() {
  try {
    window.dispatchEvent(new CustomEvent(START_EVENT));
  } catch {}
}

function hasSeenGuided(): boolean {
  try {
    return localStorage.getItem(GUIDED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Monta o tour guiado adaptado ao papel e cuida do disparo:
 * - reabre via evento `reinoemcena:start-tour` (botão na Ajuda);
 * - abre automaticamente uma vez, mas só DEPOIS do modal de boas-vindas,
 *   para os dois não competirem pela tela.
 */
export function GuidedTourLauncher() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const role = ((session?.user as { role?: Role })?.role || "membro") as Role;

  // Reabertura manual.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(START_EVENT, handler);
    return () => window.removeEventListener(START_EVENT, handler);
  }, []);

  // Auto-abre uma vez, após o usuário já ter visto o modal de boas-vindas.
  useEffect(() => {
    if (status !== "authenticated") return;
    if (hasSeenGuided()) return;
    if (!hasSeenTutorial()) return; // espera o welcome ser concluído primeiro
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <GuidedTour
      steps={getTourSteps(role)}
      open={open}
      onClose={() => setOpen(false)}
      storageKey={GUIDED_KEY}
    />
  );
}
