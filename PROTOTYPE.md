# GIS Frontend Prototype

This branch contains the frontend-only prototype clone.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS v4
- Lucide React
- CSS-driven interaction/animation
- Static export for Cloudflare Pages
- No Supabase, Stripe, Resend, Auth or backend

## Cloud development
Open this repository in GitHub Codespaces. The dev container installs dependencies automatically and forwards port 3000.

```bash
npm run dev
```

## Production static build
```bash
npm run build
```

The static output is generated in `out/` and can be deployed to Cloudflare Pages.

## Prototype interactions
- Responsive navigation
- Hero CTA
- Template gallery
- Workflow section
- FAQ accordion
- Simulated cart drawer
- Responsive mobile layout

Replace the demo preview blocks with your own licensed Figma exports/assets when ready.
