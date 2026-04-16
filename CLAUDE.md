# Claude Instructions — Geant4 Geometry Editor

## Project Overview
A web-based visual editor for Geant4 detector geometries. React + Three.js frontend, Node.js/Express backend, Vite build system. Geometry is stored and exchanged as JSON.

## Key Directories
- `src/components/` — React UI components (geometry-editor, viewer3D, material-editor, json-viewer, project-manager)
- `src/contexts/` — AppStateContext (global state)
- `src/hooks/` — useAppState (central state hook)
- `tools/converter/` — Python converter for XENONnT geometry (canonical and only location)
- `docs/` — MkDocs documentation

## Workflow Rules
- After significant code changes, update `README.md` to reflect new features, changed structure, or removed functionality.
- Run `npm test` after modifying any utility modules to verify the 116 Vitest unit tests still pass.
- The converter in `tools/converter/` is the only version — there is no copy in mc-master.

## Git Workflow
- Commit individual logical changes; use descriptive messages explaining *why*, not just *what*.
- Push to the remote branch with `git push origin <branch>`.
- Open pull requests via `gh pr create`; target `main` unless otherwise instructed.
- Merge PRs with `gh pr merge --squash` (preferred) or `--merge` if history should be preserved.
- Update this file whenever non-obvious project knowledge is discovered.

## Tech Stack
- Frontend: React, Three.js, Vite
- Tests: Vitest
- Docs: MkDocs
- Dev server: `npm run dev` (usually http://localhost:5173)
- Build: `npm run build`
