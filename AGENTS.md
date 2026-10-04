# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## The backend is a mirror

`convex/` and the `lib/` files it imports are copied from the website repo by
`npm run sync:backend`. Do not edit them here and never run `npx convex dev` or
`npx convex deploy` in this repo: backend changes are made and deployed in
`oxformals`, then synced.
