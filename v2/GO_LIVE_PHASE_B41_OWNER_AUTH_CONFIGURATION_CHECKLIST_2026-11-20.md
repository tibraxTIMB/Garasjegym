# GO LIVE Phase B41 – owner-side Auth provider and signup configuration checklist

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** identify Auth project settings that are not exposed by available read-only project tooling  
**Decision:** OWNER VERIFICATION REQUIRED; NO AUTH SETTINGS CHANGED

## 1. What the live database confirms

Read-only aggregate checks show:
- 3 Auth users, all non-anonymous and non-SSO.
- 3 identities, all with provider `email`.
- 3 users with a non-empty password hash.
- No OAuth/SAML/SSO identities or providers currently in use.
- The production signup trigger creates a profile while relying on `profiles.active DEFAULT true`; the function does not explicitly set `active`.
- The Auth project provider/signup configuration itself is not exposed by the connected read-only project tools. Database rows cannot prove whether public email signup, anonymous sign-in or other providers are enabled in the Dashboard.

## 2. Owner-side settings to verify in Supabase Dashboard

Open the production project `kultdmklwmilhoytrrig` only; do not change settings during this inspection.

### Authentication → Sign In / Providers
Record whether:
- Email/password sign-in is enabled.
- New user signups are enabled or disabled.
- Anonymous sign-ins are enabled or disabled.
- Any OAuth, phone, SAML or other provider is enabled despite there being no current identities for it.
- Email confirmation is required for new accounts.

Until Wave 1 changes the database trigger/default, public signup should remain disabled if the product does not require self-service registration. If signup is intentionally enabled, it is a high-priority exposure because the current profile trigger omits `active` and the database default is true.

### Authentication → URL Configuration
Record Site URL and all allowed redirect URLs. Confirm only legitimate production and controlled preview origins are present. Remove stale or untrusted origins only after checking live app flows and owner approval.

### Authentication → Security and Protection
- Verify password strength settings.
- Leaked-password protection is currently reported disabled by the production Security Advisor. Plan to enable it after Wave 0 recovery and test signup/password change/reset.
- Record MFA settings. The database currently has zero MFA factors, but project-level MFA policy must still be checked.

### Authentication → Email / SMTP
Record whether the built-in email service or custom SMTP is used, sender identity, confirmation/reset templates, and rate-limit configuration. Do not paste SMTP credentials into chat or GitHub.

### Project Settings → API / JWT
Record signing-key configuration type and token expiry policy. Never export or share the JWT signing secret. If a restore target uses a different JWT secret, expect existing access tokens to be invalid and require fresh sign-in.

## 3. Release acceptance

Return only non-secret configuration facts:
- signup enabled/disabled;
- email confirmation enabled/disabled;
- enabled provider names (not client secrets);
- anonymous sign-in enabled/disabled;
- Site URL and approved redirect hostnames;
- SMTP mode (built-in/custom), not credentials;
- leaked-password protection enabled/disabled;
- MFA policy state;
- JWT expiry duration and signing-key type, never the secret.

Compare the settings with the intended release policy. Any change is applied only after recovery evidence and explicit approval, then tested on the isolated restore first.

## 4. Execution boundary and outcome

No Auth provider, signup, email, SMTP, redirect, MFA, password-security or JWT setting was read or changed through the connected tools. This phase provides an owner-side inspection checklist because those settings are not available through the current read-only integration.

**B41 result:** Database identity/provider mix is email-only for the three existing users; project-level signup/provider configuration remains unverified. Owner dashboard verification is required before Wave 1 approval. Production remains **NO-GO**.
