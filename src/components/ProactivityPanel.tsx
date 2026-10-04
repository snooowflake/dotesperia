import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RefreshCw, Target, X } from "lucide-react";
import { api, useStore } from "@/state/store";
import type { ProactiveObjective } from "../../shared/proactivity";

const statusLabel: Record<ProactiveObjective["status"], string> = {
  active: "Actif", paused: "En pause", completed: "Terminé", attention: "Décision nécessaire",
};
const time = (at: number) => new Date(at).toLocaleString("fr-FR");

export function ProactivityPanel({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const bots = state.bots.filter(bot => !bot.hidden);
  const [objectives, setObjectives] = useState<ProactiveObjective[]>([]);
  const [botId, setBotId] = useState(bots.find(bot => bot.id === state.selectedId)?.id ?? bots[0]?.id ?? "");
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [watchPath, setWatchPath] = useState("");
  const [eventName, setEventName] = useState("");
  const [limit, setLimit] = useState(12);
  const [startNow, setStartNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const dialog = useRef<HTMLElement>(null);
  const mounted = useRef(true);
  const load = useCallback(async () => {
    try {
      const reply = await api<{ objectives: ProactiveObjective[] }>("/api/proactivity");
      if (mounted.current) { setObjectives(reply.objectives); setLoadError(""); }
    } catch (cause) { if (mounted.current) setLoadError(cause instanceof Error ? cause.message : "Le suivi est indisponible"); }
  }, []);
  useEffect(() => {
    mounted.current = true; void load();
    const timer = setInterval(() => void load(), 5_000);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener("keydown", key); previous?.focus(); };
  }, [load, onClose]);
  const create = async () => {
    if (busy) return; setBusy(true); setError("");
    try {
      await api("/api/proactivity", { method: "POST", body: JSON.stringify({ botId, name, instructions, maxDailyRuns: limit, startNow,
        ...(watchPath.trim() ? { watchPath: watchPath.trim() } : {}), ...(eventName.trim() ? { eventName: eventName.trim() } : {}) }) });
      setName(""); setInstructions(""); setWatchPath(""); setEventName(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "L'objectif n'a pas été enregistré"); }
    finally { setBusy(false); }
  };
  const act = async (id: string, action: string) => {
    if (busy) return; setBusy(true); setError("");
    try { await api(`/api/proactivity/${id}/${action}`, { method: "POST" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Action indisponible"); }
    finally { setBusy(false); }
  };
  const field = "w-full rounded-lg border border-hairline bg-app px-3 py-2 text-sm text-ink";
  const button = "rounded-lg border border-hairline px-3 py-2 text-sm hover:bg-raised disabled:opacity-40";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-label="Objectifs et proactivité"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-hairline bg-panel text-ink shadow-xl"
        onClick={event => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Target size={20} />Objectifs et proactivité</h2>
          <button autoFocus aria-label="Fermer les objectifs" className="rounded-lg p-2 hover:bg-raised" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="overflow-y-auto p-5">
          <p className="mb-5 text-sm text-ink-secondary">Confie une responsabilité à un bot. Il peut attendre un événement ou choisir quand poursuivre son objectif. Ses permissions habituelles et ses demandes d'approbation restent applicables.</p>
          <form className="grid gap-3 rounded-xl border border-hairline p-4" onSubmit={event => { event.preventDefault(); void create(); }}>
            <h3 className="font-semibold">Nouvel objectif</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">Bot responsable<select className={field} value={botId} onChange={event => setBotId(event.target.value)} required>{bots.map(bot => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select></label>
              <label className="grid gap-1 text-sm">Nom de l'objectif<input className={field} value={name} onChange={event => setName(event.target.value)} maxLength={120} required /></label>
            </div>
            <label className="grid gap-1 text-sm">Résultat attendu et actions autorisées<textarea className={field} rows={3} value={instructions} onChange={event => setInstructions(event.target.value)} maxLength={12000} placeholder="Par exemple : examiner les nouveaux documents du dossier incoming et préparer un résumé. Demander mon accord avant toute modification." required /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">Fichier ou dossier à surveiller, facultatif<input className={field} value={watchPath} onChange={event => setWatchPath(event.target.value)} placeholder="incoming" /><span className="text-xs text-ink-secondary">Chemin relatif au dossier de travail du bot sur la VM. Surveillance du premier niveau.</span></label>
              <label className="grid gap-1 text-sm">Événement autorisé, facultatif<input className={field} value={eventName} onChange={event => setEventName(event.target.value)} placeholder="nouveau_document" /><span className="text-xs text-ink-secondary">Une source privée doit fournir cet événement. La connexion seule ne démarre aucune surveillance.</span></label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={startNow} onChange={event => setStartNow(event.target.checked)} />Commencer maintenant</label>
              <label className="flex items-center gap-2 text-sm">Maximum par jour<input aria-label="Maximum d'exécutions par jour" className={`${field} w-20`} type="number" min={1} max={48} value={limit} onChange={event => setLimit(Number(event.target.value))} /><span className="text-xs text-ink-secondary">jour UTC</span></label>
              <button type="submit" disabled={busy || !botId || !name.trim() || !instructions.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-40">Activer l'objectif</button>
            </div>
          </form>
          {error && <p role="alert" className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
          {loadError && <p role="alert" className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">{loadError}</p>}
          <div className="mb-3 mt-6 flex items-center justify-between"><h3 className="font-semibold">Responsabilités enregistrées</h3><button className={button} aria-label="Actualiser les objectifs" onClick={() => void load()}><RefreshCw size={16} /></button></div>
          {!objectives.length && <p className="rounded-xl border border-hairline p-5 text-sm text-ink-secondary">Aucun objectif actif. Aucun appel au modèle n'est lancé sans responsabilité enregistrée.</p>}
          <div className="grid gap-3">
            {objectives.map(goal => <article key={goal.id} className="rounded-xl border border-hairline p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{goal.name}</h4><span className={goal.status === "attention" ? "text-sm text-danger" : "text-sm text-ink-secondary"}>{statusLabel[goal.status]}{goal.runId ? " · Exécution en cours" : ""}</span></div>
              <p className="mt-1 text-xs text-ink-secondary">{bots.find(bot => bot.id === goal.botId)?.name ?? "Bot indisponible"} · {goal.dayRuns}/{goal.maxDailyRuns} exécutions aujourd'hui · {goal.totalRuns} au total</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{goal.instructions}</p>
              {goal.watchPath && <p className="mt-2 text-xs text-ink-secondary">Surveillance : {goal.watchPath}</p>}
              {goal.eventName && <p className="mt-1 text-xs text-ink-secondary">Événement : {goal.eventName}</p>}
              {goal.nextWakeAt && goal.status === "active" && <p className="mt-2 text-xs text-ink-secondary">Prochaine étape : {time(goal.nextWakeAt)}</p>}
              {goal.status === "active" && !goal.runId && !goal.nextWakeAt && !goal.pendingWake && <p className="mt-2 text-xs text-ink-secondary">En attente d'un événement.</p>}
              {goal.status === "active" && goal.dayRuns >= goal.maxDailyRuns && <p className="mt-2 text-xs text-ink-secondary">Limite quotidienne atteinte. Reprise au prochain jour UTC.</p>}
              {goal.attention && <p className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">{goal.attention}</p>}
              {goal.checkpoint && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-raised p-3 text-sm">{goal.checkpoint}</p>}
              {goal.lastOutput && <details className="mt-3 text-sm"><summary className="cursor-pointer">Dernier résultat</summary><p className="mt-2 whitespace-pre-wrap text-ink-secondary">{goal.lastOutput}</p></details>}
              <div className="mt-3 flex flex-wrap gap-2">
                {goal.status === "active" ? <button disabled={busy} className={button} onClick={() => void act(goal.id, "pause")}><Pause size={14} className="mr-1 inline" />Mettre en pause</button> : goal.status !== "completed" && <button disabled={busy} className={button} onClick={() => void act(goal.id, "resume")}><Play size={14} className="mr-1 inline" />Reprendre</button>}
                {goal.status === "active" && <button disabled={busy || Boolean(goal.runId)} className={button} onClick={() => void act(goal.id, "run")}>Poursuivre maintenant</button>}
                {goal.status !== "completed" && <button disabled={busy} className={button} onClick={() => void act(goal.id, "complete")}>Terminer l'objectif</button>}
              </div>
            </article>)}
          </div>
        </div>
      </section>
    </div>
  );
}
