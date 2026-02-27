# TypeScript Conventions

## tsconfig flags (frontend — strict + extra)
- noUnusedLocals, noUnusedParameters → prefix unused with _
- verbatimModuleSyntax → use `import type` for type-only imports
- noUncheckedSideEffectImports → CSS imports fine via vite/client types
- erasableSyntaxOnly → no decorators or const enums

## Common patterns
- Type-only Supabase imports: `import type { Session, User, AuthError } from "@supabase/supabase-js"`
- ReactNode: `import type { ReactNode } from "react"` (not React.ReactNode without React import)
- FormEvent: `import type { FormEvent } from "react"`
- Phosphor icons: `import { Sun, Moon, CircleNotch } from "@phosphor-icons/react"`

## Backend strict mode
- req.user! non-null assertion after verifyAuth middleware
- Explicit return types on async handlers: Promise<void>
- No implicit any — all function params typed

## Editing rule
- morph-mcp (mcp__morph-mcp__edit_file) for ALL edits to existing files
- Write tool only for new files or when morph-mcp is unavailable
- Always read file before using Write tool
