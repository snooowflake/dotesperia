// The fork is deployed as a private Linux service. The upstream desktop
// launcher contains hosted-account, backup and updater transports outside the
// server's boundary, so do not execute it in this distribution.
throw new Error("Dotesperia uses the private self-hosted web interface. The upstream Electron launcher is disabled in this fork.");
