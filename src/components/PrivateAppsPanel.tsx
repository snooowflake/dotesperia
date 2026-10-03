import { useEffect } from "react";
import { X } from "lucide-react";
import { useStore } from "@/state/store";
import { McpServersPanel } from "./McpServersPanel";

/** Only operator-controlled connections are offered in the private fork. */
export function PrivateAppsPanel() {
  const { dispatch } = useStore();
  const close = () => dispatch({ type: "togglePlugins", open: false });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "togglePlugins", open: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);
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
          <p className="mb-5 text-sm text-ink-secondary">
            Connecte tes outils locaux et les services que tu héberges. Les connexions distantes doivent être autorisées par la politique réseau du serveur.
          </p>
          <McpServersPanel embedded />
        </div>
      </section>
    </div>
  );
}
