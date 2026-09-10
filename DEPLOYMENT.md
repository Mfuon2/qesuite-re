# QeSuite production deployment

QeSuite is deployed as one Cloudflare Worker named `qesuite-re`. The Worker
serves the React PWA and handles `/api/*`; its `DB` binding targets the D1
database named `qesuite-re`.

## Cloudflare Workers Builds settings

The GitHub repository is connected directly to the `qesuite-re` Worker. In
**Cloudflare → Workers & Pages → qesuite-re → Settings → Builds**, use:

- Production branch: `main`
- Root directory: `/`
- Build command: `bun run ci:build`
- Deploy command: `bun run release`
- Non-production branch builds: disabled

Cloudflare supplies the build's deployment credentials. No Cloudflare token is
stored in GitHub. The Worker name in Cloudflare and `wrangler.jsonc` must both
remain `qesuite-re`.

The repository also includes a root `wrangler.jsonc` shim so Cloudflare's
default `wrangler deploy` can resolve the built Worker when a connected trigger
has not yet been updated. Keep the deploy command as `bun run release` so D1
migrations always run before deployment.

## Release flow

1. Open a pull request into `main`.
2. GitHub Actions installs the locked dependencies, runs tests and TypeScript,
   builds the application, and validates the generated Cloudflare bundle. It
   has no Cloudflare credentials and cannot deploy.
3. Review and merge the pull request only after the validation job passes.
4. Cloudflare Workers Builds detects the merge commit on `main` and runs
   `bun run ci:build`.
5. Its deploy step runs `bun run release`; Wrangler applies pending D1
   migrations to `qesuite-re` first.
6. If every migration succeeds, Wrangler deploys the Worker and PWA assets.

Pull requests never change Cloudflare resources or production data. A failed
validation or migration stops the build before application deployment.

Protect `main` and require the **Validate** check before allowing a merge. A
controlled production retry is started from the build history in Cloudflare.

## Migrations

Create schema changes as new sequential SQL files in `apps/app/migrations`.
Never modify a migration that has already reached production. D1 records
applied filenames in its migration table, applies only pending files, captures
a backup before applying, and rolls back a migration that fails.

Check and apply migrations locally before opening a pull request:

```bash
npm run db:migrate:local
npm test
npm run typecheck
npm run build
npm run deploy:check
```

The CI deployment order is deliberately **validate → migrate → deploy**. Keep
schema changes backward-compatible with the currently deployed Worker because
the migration completes immediately before the new Worker version is released.

## Recovery

If validation fails, fix the branch and update the pull request. If a production
migration fails, create a new corrective migration; do not rewrite an applied
migration. If deployment fails after migrations succeed, the workflow can be
retried because D1 skips migrations it has already recorded. Cloudflare Worker
versions remain available for an application rollback when necessary.
