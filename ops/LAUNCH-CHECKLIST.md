# ParkZone launch checklist

Everything below must be true before `parkzone.in` takes real money. Items marked
**BLOCKING** will actively break or leak something if skipped.

## 1. Secrets and accounts  
- [ ] **BLOCKING** Rotate the MongoDB Atlas password. It was written to
      `backend/.env`, a git tree, a session transcript and shell history - treat it
      as compromised.
- [ ] **BLOCKING** Create a least-privilege Atlas user (`readWrite` on `parkzone`
      only), not an admin user, and put that URI in the server's `.env`.
- [ ] **BLOCKING** Set `PZ_DEV_MODE=false` in production `.env`.
- [ ] **BLOCKING** Set `PZ_ADMIN_TOKEN` to a long random value (guards
      `POST /api/wallet/add`).
- [ ] **BLOCKING** Set `PZ_HOST_TOKEN` to a long random value (guards heartbeat,
      `/api/jobs`, `/api/job-status`) and ship it with the agent build.
- [ ] Confirm `backend/.env` is `root:parkzone` `640` and git-ignored
      (`git check-ignore -v backend/.env`).
- [ ] Atlas network access: allow only the VPS egress IP, never `0.0.0.0/0`.

## 2. Payments  
- [ ] **BLOCKING for charging users** Razorpay account (KYC + GST) live.
- [ ] Webhook (`payment.captured`) wired to `POST /api/wallet/add` with the admin
      token; webhook signature verified before crediting.
- [ ] Top-up buttons in the console already disable themselves when
      `dev_mode=false` - verify they say something useful, not just "disabled".
- [ ] Refund flow: Razorpay refund API behind `refunds@parkzone.in` process.
- [ ] UPI payouts for hosts (RazorpayX / Payouts) with the Rs 500 threshold.

## 3. Host agent  
- [ ] Build and **sign** the Windows binary:
      `pyinstaller --onefile --noconsole --name ParkZoneAgent agent.py`
- [ ] Publish it as `public/agent.exe` (nginx already serves it with a download
      header). The host page disables the button automatically until this exists.
      **This is the one expected warning:** `tests/check_frontend.py` reports
      `WARN=2` (the two download buttons on `/host`) until the real signed build
      is committed. It is deliberately NOT committed as a placeholder - a fake
      `.exe` would be worse than a 404.
- [ ] Publish its SHA-256 on `/host` and keep the previous hash for audit.
- [ ] Smoke it on a real Windows 10/11 box with WSL2 + Docker + an NVIDIA driver
      before accepting host signups.
- [ ] Confirm `no-new-privileges` and resource limits actually apply
      (`docker inspect` on a running rental).

## 4. Legal and Indian compliance  
- [ ] **BLOCKING** Registered office address: publish it in the footer of invoices
      and in the privacy notice (DPDP/IT Rules requirement for the grievance officer).
- [ ] **BLOCKING** Real name + postal address of the Grievance Officer (the policy
      pages currently promise "available on request" - replace with the actual
      name and address before launch).
- [ ] GSTIN registered (or explicitly operating under the Rs 20 lakh threshold).
- [ ] Terms/privacy/refund reviewed by a lawyer; dates already set to 1 Oct 2026.
- [ ] Payout KYC flow for hosts above the statutory threshold.
- [ ] Prohibited-use policy (mining ban) enforced by the image allow-list - confirm
      no path lets a renter pass an arbitrary image.

## 5. Infrastructure  
- [ ] `parkzone-api.service` enabled, `journalctl -u parkzone-api` clean.
- [ ] `ops/pz-security-headers.conf` copied to `/etc/nginx/snippets/`.
- [ ] `bash ops/validate-nginx.sh --run` green on the VPS.
- [ ] certbot installed + auto-renewal tested (`certbot renew --dry-run`).
- [ ] `ops/backup.sh` in cron and a **restore has actually been drilled**
      (`mongorestore --dryRun` against a real dump).
- [ ] External uptime monitor on `https://parkzone.in/api/health` (expects 503 on
      DB outage, alert on any other status).
- [ ] Disk and log rotation (`ops/parkzone-logrotate.conf`) installed.

## 6. Release gates  
- [ ] `bash tests/run_all.sh --live` passes on a clean checkout.
- [ ] Front-end checker reports `FAIL=0 WARN=0` (classes, links, CSP, a11y, SEO).
- [ ] Lighthouse: mobile performance >= 90, no third-party requests (fonts and CSS
      are self-hosted for exactly this reason).
- [ ] `grep -rn "/gpu/" public/` returns nothing (the old prefix that 404'd).
- [ ] OG card renders correctly in a preview tool (`assets/og.png`).
- [ ] `/status` shows green for every component from an external network.

## 7. Nice to have, not blocking  
- [ ] API keys for renters (the docs already say "keys next").
- [ ] HMAC signatures on host traffic on top of the bearer token.
- [ ] `agent.exe` Authenticode code-signing certificate (SmartScreen reputation).
- [ ] Playwright smoke over the real pages for visual regression.
