# MOVI Frontend Instructions

## Project and stack

This repository contains only the frontend for the 2026 Financial AI Challenge project, "Voice-First Inclusive Banking & FDS". Use Next.js App Router under `src/app`, strict TypeScript, Tailwind CSS, Zustand, Axios, and npm. Do not create or modify backend code; it runs in a separate IntelliJ project.

## Product and architecture

- Treat the user's MVP specification as the product source of truth. Do not invent features, API contracts, authentication behavior, or transaction rules.
- Put routes in `src/app`, shared UI in `src/components/common`, feature UI in `src/components/domain`, API and mock switching in `src/services`, shared client state in `src/store`, and domain types in `src/types`.
- Search for existing code before adding code. Extract shared components when reused or when they enforce a clear accessibility contract; avoid premature abstraction.
- Components must not branch on mock mode. The service layer owns mock/real selection.

## Type and data safety

- Do not use `any`; accept uncertain external data as `unknown` and validate it.
- Explicitly type props and API data. Prefer storing entity IDs over duplicate objects.
- Never log or commit real account numbers, credentials, tokens, or personal data.
- Read `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_USE_MOCK`; keep mock and real data compatible with the same types.
- Do not commit `.env` files or choose an authentication scheme without backend agreement.

## Accessibility and voice

- Prefer semantic HTML and native controls; do not add redundant ARIA roles.
- Ensure controls have accessible names. Use `aria-label` only when visible text does not provide one.
- Preserve keyboard operation, a strong `focus-visible` indicator, and targets of at least 44 by 44 CSS pixels.
- Do not communicate status by color alone. Use live regions for important asynchronous changes.
- Voice features require visible and keyboard alternatives. Handle permission denial, unsupported browsers, network errors, and reduced motion.
- Never finalize a financial transaction from speech recognition alone; require explicit review and confirmation.

## Styling and workflow

- Reuse tokens from `src/app/globals.css`, keep one primary color family, avoid unapproved decorative gradients, and target WCAG AA contrast.
- Inspect relevant files before editing and never erase or revert user changes.
- Ask before deleting user-authored files, changing major dependencies/auth/API contracts, deploying, committing, pushing, or opening a PR.
- Run relevant lint, typecheck, tests, and build checks. Report changed files, checks, assumptions, remaining work, and backend needs.
