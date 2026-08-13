/** Converte um timestamp do Postgres (sem timezone) para Date, assumindo UTC. */
function toDate(iso: string): Date {
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
  return new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
}

/** Ex.: "12/08/2026, 14:32" */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return toDate(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Ex.: "12/08, 14:32" — mais compacto, usado em listas. */
export function formatShortDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return toDate(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Ex.: "há 3 min", "há 2 h", "há 5 dias" */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const date = toDate(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 1) return "agora mesmo";
    if (diffMin < 60) return `há ${diffMin} min`;

    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours} h`;

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) return `há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;

    return formatShortDateTime(iso);
  } catch {
    return iso;
  }
}
