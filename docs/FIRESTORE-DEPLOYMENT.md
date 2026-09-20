# Firestore deployment verification

Deployment on September 15, 2026 (September 16 UTC), from this local checkout.

## Target

- Firebase project: `ai-space-f1d31`.
- Database: `(default)`, Firestore Native, Standard edition.
- Location: `us-central1`.
- Deployment scope: Firestore rules, composite indexes, and single-field index overrides.

## Rules

The isolated `demo-ai-space` Auth/Firestore/Functions emulator integration suite passed before deployment. Firebase also compiled the rules successfully.

Live unauthenticated reads of a profile probe and private quiz-session probe both returned HTTP 403 `PERMISSION_DENIED`. The live rules were read back and matched `firestore.rules` byte for byte:

- SHA-256: `9faf6299ff0079d702e8bf21403f6de2dbddae895d918eeb2538d5e548be9886`.
- Live ruleset: `projects/ai-space-f1d31/rulesets/0d63556d-c8e6-409a-b8ea-6ce42620972f`.
- Release updated: `2026-09-16T00:53:17.284097Z`.

## Indexes

At `2026-09-16T00:58:12.888Z`, all three composite indexes and all four configured field indexes reported `READY`. Read-back verification confirmed their collection scopes, fields, array configuration, and sort directions match the repository definitions. TTL remained disabled.

All three deployed composite index definitions match `firestore.indexes.json` (excluding Firestore's automatically appended document-name field):

| Collection | Fields |
| --- | --- |
| `gallery` | `status ASC`, `createdAt DESC` |
| `gallery` | `uid ASC`, `createdAt DESC` |
| `invites` | `participants CONTAINS`, `createdAt DESC` |

The ascending `expiresAt` field index overrides were also deployed for `events`, `quizSessions`, `presence`, and `rateLimits`.

## Remaining setup

- Firebase rejected TTL cleanup activation because project billing is disabled. The successful deployment retained every index definition and omitted only the four `ttl` flags in a temporary deployment configuration. The canonical repository configuration retains those policies for activation after billing is enabled. Automatic TTL cleanup is not active.
- Production Cloud Functions and hosting were not deployed. Ranked quizzes, onboarding, social writes, and other server-authoritative actions still require the functions deployment.
- Configure the reCAPTCHA v3 secret in Firebase App Check's web-app registration and its public site key in `.env`. Real Google sign-in and production App Check remain to be verified end to end.
