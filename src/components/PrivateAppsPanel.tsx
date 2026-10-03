import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, useStore } from "@/state/store";
import { McpServersPanel } from "./McpServersPanel";

/** Only operator-controlled connections are offered in the private fork. */
export function PrivateAppsPanel() {
  const { dispatch } = useStore();
  const [desktop, setDesktop] = useState<{ ready: boolean; configured: boolean; viewerUrl: string | null } | null>(null);
  const close = () => dispatch({ type: "togglePlugins", open: false });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "togglePlugins", open: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);
  useEffect(() => {
    let live = true;
    const refresh = () => api<{ ready: boolean; configured: boolean; viewerUrl: string | null }>("/api/private-desktop/status")
      .then(value => { if (live) setDesktop(value); }).catch(() => { if (live) setDesktop(null); });
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 10000);
    return () => { live = false; window.clearInterval(timer); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={close}>
      <section role="dialog" aria-modal="true" aria-label="Applications privées"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-panel shadow-xl"
        onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold text-ink">Applications privées</h2>
          <button autoFocus aria-label="Fermer" onClick={close} className="rounded p-2 text-ink-secondary hover:text-ink"><X size={20} /></button>
        </header>
        <div className="overflow-y-auto px-6 py-5">
          <section className="mb-5 rounded-xl border border-line p-4" aria-label="Bureau privé">
            <h3 className="font-semibold text-ink">Bureau privé sur la VM audit</h3>
            <p className="mt-2 text-sm text-ink-secondary">Un ordinateur séparé pour tes Dots, disponible même quand ton PC est éteint. Leurs fichiers, tâches et mémoires restent sur la VM.</p>
            <p className="my-3 text-sm text-ink-secondary">{desktop?.ready ? "Bureau disponible. Les outils du bureau passent par les approbations habituelles." : desktop?.configured ? "Le bureau démarre ou est momentanément indisponible." : "Le bureau doit être activé sur le serveur."}</p>
            {desktop?.ready && desktop.viewerUrl && <a href={desktop.viewerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">Ouvrir le bureau</a>}
          </section>
          <p className="mb-5 text-sm text-ink-secondary">
            Connecte tes outils locaux et les services que tu héberges. Les connexions distantes doivent être autorisées par la politique réseau du serveur.
          </p>
          <McpServersPanel embedded />
        </div>
      </section>
    </div>
  );
}
