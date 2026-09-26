# LocalMate — Google Play listing draft

## App identity
- **App name:** LocalMate
- **Package:** `app.localmate.rishikesh`
- **Short description (80 chars max):**
  Need something done in Rishikesh? Find a trusted local helper.
- **Full description:**
  LocalMate connects travellers and locals in Rishikesh for small everyday tasks — luggage help, local errands, and more.

  Post a task with your budget (fixed or negotiable). Cleared helpers nearby can accept or make an offer. Chat in-app, confirm completion, and keep payments held until the job is done (prototype / demo payments).

  Built for Rishikesh. Hindi + English.

- **Category:** Lifestyle
- **Tags:** local help, rishikesh, tasks, errands
- **Privacy policy URL:** https://localmate-omega.vercel.app/privacy
- **Contact email:** (add your Play Console email)

## Release checklist
1. Create Play Console developer account (~$25): https://play.google.com/console
2. Create app → package `app.localmate.rishikesh`
3. Complete Store listing + Data safety + Content rating
4. Upload **AAB** from GitHub Actions artifact `localmate-release-aab` (or `dist-apk/`)
5. Start with **Internal testing** track first, then Production

## Signing
- Local keystore: `android/keystore/localmate-release.jks` (gitignored)
- GitHub secrets required for CI:
  - `LOCALMATE_KEYSTORE_BASE64`
  - `LOCALMATE_STORE_PASSWORD`
  - `LOCALMATE_KEY_PASSWORD`
  - `LOCALMATE_KEY_ALIAS` (= `localmate`)
