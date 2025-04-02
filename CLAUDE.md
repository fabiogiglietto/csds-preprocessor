# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint Commands
- Build: `npm run build` (TypeScript compilation + Vite build)
- Dev server: `npm run dev` (Vite development server)
- Lint: `npm run lint` (ESLint with TypeScript)
- Preview: `npm run preview` (Preview production build)
- Deploy: `npm run deploy` (deploys to GitHub Pages)

## Code Style Guidelines
- **TypeScript**: Strict typing with proper interfaces/types defined in `src/types/`
- **React**: Functional components with hooks (useState, useEffect)
- **Imports**: Group React imports first, followed by third-party libraries, then local imports
- **CSS**: TailwindCSS for styling with utility classes
- **Error Handling**: Use try/catch blocks with console.error/warn for issues, provide user feedback
- **Naming**: camelCase for variables/functions, PascalCase for components/interfaces
- **Components**: Keep components focused on a single responsibility
- **CSV Processing**: Use PapaParse for CSV handling and JSZip for file operations
- **File Structure**: Components in src/components/, types in src/types/