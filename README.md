
# B Add Guru Tools — GitHub + Supabase Launch Kit

This ZIP is safe to upload to a public GitHub repository after you replace public configuration placeholders.
DO NOT put Gemini/Veo API keys, Supabase service-role keys, payment secrets, TOTP secrets, or private software ZIPs in GitHub.

## What works after configuration
- Public marketing website
- Tools, pricing, help/support and legal pages
- Email/password signup
- Email OTP verification (configure the Supabase email template to show `{{ .Token }}`)
- Mandatory authenticator/TOTP enrollment
- TOTP challenge on login
- Daily frontend logout/re-authentication UX
- AAL2 requirement for protected secure-download function
- Private software downloads through short-lived signed Supabase Storage URLs
- Database schema for profiles, subscriptions and usage ledger
- Payment functions are deliberately locked until a real merchant provider is connected

## 1. Free public hosting — GitHub Pages
1. Create a new public GitHub repository, for example `b-add-guru-tools`.
2. Upload the CONTENTS of this ZIP.
3. Repository Settings -> Pages.
4. Source: Deploy from a branch.
5. Branch: `main`, folder `/ (root)`, Save.
6. Your free URL becomes `https://YOUR-USERNAME.github.io/b-add-guru-tools/`.

GitHub Pages hosts static files free. A custom domain is supported, but the domain registration itself is normally not free.

## 2. Create Supabase project
1. Go to Supabase and create a project.
2. Project Settings/API: copy Project URL and anon/public key.
3. Paste them into `assets/js/config.js`.
4. Never paste the service-role key into the website.
5. SQL Editor -> run `supabase/schema.sql`.

## 3. Email verification code
In Supabase Authentication -> Email Templates:
- Edit Confirm signup / OTP template.
- Include `{{ .Token }}` so the email contains a code.
- The frontend verifies that provider-generated code.
Do not create predictable OTPs yourself.

## 4. Authenticator MFA
Supabase Auth supports TOTP MFA.
The login page:
- enrolls a TOTP factor,
- displays the returned QR code,
- asks for the authenticator code,
- challenges/verifies the factor,
- requires AAL2 before protected access.

For stronger "every day" security, use Supabase session-expiry/time-box settings appropriate to your plan in addition to the frontend daily logout check.

## 5. Private software file
DO NOT commit the paid/protected ZIP into a public GitHub repository.
In Supabase Storage:
1. Create a PRIVATE bucket named `software`.
2. Upload your local release and name it:
   `Cinematic-Movie-Factory-latest.zip`
3. Deploy the `secure-download` Edge Function.
4. The dashboard calls it only after authentication + AAL2.
5. It returns a signed URL that expires in 5 minutes.

## 6. Edge Functions
Using Supabase CLI:
- deploy `secure-download`
- deploy `create-checkout`
- deploy `payment-webhook`

The hosted Supabase environment supplies project URL/keys to functions. Keep `SUPABASE_SERVICE_ROLE_KEY` only in server secrets.

## 7. Payment
The included checkout/webhook functions are intentionally disabled until you have an approved merchant account.
Recommended flow:
User -> choose plan -> provider checkout -> provider verifies payment -> signed webhook -> server activates plan/credits.

Never activate a plan because:
- user enters an OTP,
- user uploads a payment screenshot,
- browser JavaScript says `paid=true`,
- user claims money was sent.

For Pakistan, apply for an approved merchant/payment-gateway account (for example Easypaisa/JazzCash if they approve your business and integration). Settlement destination is configured in the merchant account.

## 8. Suggested starting plans
- Free: PKR 0 — local whiteboard/editor, no paid realistic-video minutes
- Starter: PKR 2,999/month — target up to 1 paid realistic minute
- Creator: PKR 7,999/month — target up to 4 paid realistic minutes
- Pro: PKR 19,999/month — target up to 10 paid realistic minutes

These are launch placeholders. Recalculate before selling based on current provider cost, payment fees, retries, taxes and desired margin.

## 9. Contact email
Replace:
`YOUR_SUPPORT_EMAIL@gmail.com`
inside `assets/js/config.js`.
The assistant cannot infer the Gmail address attached to your ChatGPT account.

## 10. Ads/monetization
The site contains About, Contact, Privacy, Terms, Disclaimer, Copyright, Refund, Cookies, Help and Support pages.
These improve transparency but DO NOT guarantee approval by any advertising network. Approval also depends on original content, site quality, navigation, policy compliance and the ad network's current rules.

## 11. Custom domain
After buying/owning a domain:
GitHub repository -> Settings -> Pages -> Custom domain -> enter domain -> Save.
Then add the required DNS records at your domain registrar and enable HTTPS after DNS resolves.

## 12. Security rules
- Public frontend contains only the Supabase anon key.
- Paid AI API keys stay server-side only.
- Every paid generation endpoint checks user, AAL2, plan, credits and rate limits.
- Log usage server-side.
- Set provider spending caps.
- Never intentionally crash or hang a user's device; block unauthorized requests with 401/403 instead.

## v2 portal + private local engine

The public site now includes `creator.html`, a premium status-driven workspace.
Users do NOT choose model IDs and do NOT see API-key settings.

Automatic policy:
- Browser checks basic hardware.
- Private Local Engine checks actual Windows GPU/RAM/CPU.
- NVIDIA CUDA >= 8 GB VRAM: marks the device eligible for a local realistic backend.
- Other hardware: automatically uses local whiteboard/photo-motion mode.
- Paid cloud API keys must remain server-side only and are not present in the GitHub frontend.

### IMPORTANT upload rule
Do NOT upload `PRIVATE-LOCAL-ENGINE/` to a public GitHub repository.
Upload only the public website files/folders.
Keep the private engine in private storage and deliver it through the existing signed-download flow after login/MFA/entitlement.

The included private engine is a real working offline whiteboard renderer. It uses local Windows TTS + Pillow + FFmpeg and consumes zero cloud video credits.
Heavy realistic-video model weights are intentionally not bundled because they are multi-gigabyte packages and the current Intel UHD 620-class hardware is not suitable for them.

## v2 Web Workspace + Protected Local Engine
- The Movie Factory UI now runs at `movie-factory.html`; users do not see AI provider settings or API keys.
- A protected Local Engine runs on `127.0.0.1:8787` and reports live hardware/model/status information.
- The browser never chooses a model. The Local Engine automatically selects:
  - supported local realistic route when a compatible local AI backend is detected;
  - otherwise zero-credit local whiteboard route.
- Public GitHub files contain no paid API key.
- Each tool has a separate `tool_entitlements` row. Buying one tool does not automatically unlock future tools.
- Upload the Local Engine ZIP to the PRIVATE `software` bucket as `B-Add-Guru-Local-Engine-latest.zip`.


## v3 Automatic Movie Factory + Per-Tool Licensing
- Website brand: **B Add Guru Tools**.
- One website account + one TOTP authenticator identity for the whole portal.
- Each tool is sold/unlocked separately through `tool_entitlements`.
- User never sees Gemini/Veo/Wan/owner-provider API settings.
- Movie Factory shows live progress, route, WanGP, ComfyUI, scene timeline and accumulated preview.
- Local Engine selects the route automatically from real hardware/backend checks.
- If local realistic generation is not genuinely ready, the safe zero-credit route is Whiteboard Local.
- Owner can inspect accounts/payments/usage at `admin.html` after setting their own `profiles.role='admin'`.
- Deploy Edge Function `admin-overview` in addition to the existing functions.

### Make yourself admin
After creating and verifying your own website account, find your user UUID in Supabase Authentication -> Users, then run:
`update public.profiles set role='admin' where id='YOUR-USER-UUID';`

### Domain name
The build keeps the brand `B Add Guru Tools`. Candidate domains to check at your registrar:
- `baddguru.com`
- `baddgurutools.com`
- `baddguru.ai`
A web search on 2026-09-29 returned no obvious indexed site for those exact strings, but that is NOT a registrar availability guarantee. Confirm before purchase.

### Payment truth
Checkout activation must come only from the provider's verified webhook/transaction API. The included generic payment functions remain intentionally disabled until you receive real merchant credentials.
