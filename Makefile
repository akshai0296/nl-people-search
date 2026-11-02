SHELL := /bin/bash
SUPABASE := npx --no-install supabase
WITH_ENV := ./scripts/with-supabase-env.sh

.PHONY: setup dev watch test eval check-contract check-security check-free-limit replay-stripe stop

## Install dependencies, start local Supabase, apply migrations and load candidates.json.
setup:
	@./scripts/check-prereqs.sh
	npm ci
	$(SUPABASE) start
	$(SUPABASE) db reset --local --yes
	$(WITH_ENV) node scripts/seed.mts

## Serve the app on http://localhost:3000 (an optimised build, so timings are representative).
dev:
	@$(SUPABASE) start >/dev/null
	$(WITH_ENV) bash -c 'npm run build && npm run start -- --port 3000'

## Hot-reloading development server.
watch:
	@$(SUPABASE) start >/dev/null
	$(WITH_ENV) npm run dev -- --port 3000

## Unit tests (signature verification, filter validation).
test:
	node --test 'tests/**/*.test.mts'

## Run queries.json through the running app and score precision and recall.
eval:
	$(WITH_ENV) node scripts/eval-search.mts

## Call every API route (fresh DB) and check codes and shapes.
check-contract:
	$(WITH_ENV) node scripts/check-contract.mts

## Try to cross the tenant boundary through the API and Supabase directly; scan the bundle for secrets.
check-security:
	$(WITH_ENV) node scripts/check-security.mts

## Fire 25 concurrent searches from acme (fresh DB) and check exactly one is allowed.
check-free-limit:
	$(WITH_ENV) node scripts/check-free-limit.mts

## Replay data/stripe-events.json (re-signed with STRIPE_WEBHOOK_SECRET) and print each plan.
replay-stripe:
	$(WITH_ENV) node scripts/replay-stripe-events.mts

stop:
	$(SUPABASE) stop
