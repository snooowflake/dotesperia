// The upstream launcher can enroll hosted accounts and start public tunnels.
// Private installations use the dedicated services and pairing helper instead.
export {};
throw new Error("Dotesperia disables the upstream launcher and companion. Use deploy/dotesperia/install-services.sh and pair-ui.sh; see docs/dotesperia/deployment.md.");
