# POgrid.id — v1 Launch Todo List

> Detailed task list derived from LAUNCH_PLAN.md + Codebase Audit
> Use [ ] for pending, [~] for in-progress, [x] for done, [!] for blocked

---

## Phase 0: CODEBASE GAPS — Must Build Before Launch

> Found during codebase audit. These are CODE CHANGES, not just testing.

### 0A: Trial Period Enforcement 🔴 CRITICAL

**Problem**: `trial_ends_at` field exists on Tenant model, but NO middleware enforces it. Expired trial users can still access everything.

- [ ] 0A.1 Create `CheckTrialStatus` middleware
  - File: `app/Http/Middleware/CheckTrialStatus.php`
  - Logic: If `tenant.trial_ends_at < now()` AND `subscription_status != 'active'` → block access
  - Redirect to `/subscription/expired` page
- [ ] 0A.2 Register middleware in `bootstrap/app.php`
- [ ] 0A.3 Apply to all authenticated routes (except `/subscription/*` and `/logout`)
- [ ] 0A.4 Create `/subscription/expired` page
  - File: `resources/js/Pages/Subscription/Expired.tsx`
  - Show: "Trial expired. Please subscribe to continue."
  - CTA: "Subscribe Now" button
- [ ] 0A.5 Skip check for Owner role with `is_owner=true` (optional — owner should also pay)
- [ ] 0A.6 Test: expired trial → blocked, active trial → allowed
- [ ] 0A.7 Test: paid subscription → always allowed

### 0B: Payment Gateway Integration 🔴 CRITICAL

**Problem**: No payment code exists. Cannot collect revenue.

- [ ] 0B.1 Choose provider: Midtrans (recommended for Indonesia)
- [ ] 0B.2 Create Midtrans account + get API keys (sandbox first)
- [ ] 0B.3 Install Midtrans PHP SDK: `composer require midtrans/midtrans-php`
- [ ] 0B.4 Create `payments` table migration
  ```
  payments: id, tenant_id, amount, status (pending|success|failed),
            payment_method, midtrans_order_id, midtrans_transaction_id,
            created_at, updated_at
  ```
- [ ] 0B.5 Create `Payment` model
- [ ] 0B.6 Create `PaymentController` with:
  - `createPayment()` — generate Midtrans Snap token
  - `handleCallback()` — webhook from Midtrans
  - `paymentSuccess()` — update tenant subscription_status
- [ ] 0B.7 Add routes in `routes/web.php`:
  ```
  POST /subscription/pay
  POST /subscription/callback (Midtrans webhook)
  GET /subscription/success
  ```
- [ ] 0B.8 Configure Midtrans webhook URL in dashboard
- [ ] 0B.9 Test with Midtrans sandbox
- [ ] 0B.10 Switch to Midtrans production keys

### 0C: Subscription Management UI 🟡

**Problem**: No billing page, no plan selection, no payment history.

- [ ] 0C.1 Design subscription plans (Basic/Pro/Enterprise)
- [ ] 0C.2 Create `subscriptions` table migration
  ```
  subscriptions: id, tenant_id, plan, status (active|cancelled|expired),
                  starts_at, ends_at, created_at, updated_at
  ```
- [ ] 0C.3 Create `Subscription` model
- [ ] 0C.4 Create `SubscriptionController` with:
  - `index()` — show current plan + billing history
  - `plans()` — list available plans
  - `subscribe()` — initiate payment
  - `cancel()` — cancel subscription
- [ ] 0C.5 Create billing page
  - File: `resources/js/Pages/Subscription/Billing.tsx`
  - Show: current plan, status, next billing date, payment history
- [ ] 0C.6 Create plan selection page
  - File: `resources/js/Pages/Subscription/Plans.tsx`
  - Show: plan cards with features + pricing
- [ ] 0C.7 Create payment success page
  - File: `resources/js/Pages/Subscription/Success.tsx`
- [ ] 0C.8 Add billing link to Owner dashboard
- [ ] 0C.9 Test: view plans, select plan, complete payment, see history

### 0D: Trial Expiry Reminders 🟡

**Problem**: No notification when trial is about to expire.

- [ ] 0D.1 Create `SendTrialReminders` command
  - File: `app/Console/Commands/SendTrialReminders.php`
  - Logic: Find tenants where `trial_ends_at` is within 3 days AND `subscription_status != 'active'`
  - Send email reminder
- [ ] 0D.2 Create trial reminder email template
  - File: `resources/views/emails/trial-reminder.blade.php`
  - Content: "Your trial expires in X days. Subscribe to continue."
- [ ] 0D.3 Register command in `routes/console.php`
  - Schedule: daily at 09:00
- [ ] 0D.4 Create trial expiry email template (for day of expiry)
  - File: `resources/views/emails/trial-expired.blade.php`
- [ ] 0D.5 Test: send reminder email, verify content
- [ ] 0D.6 Test: command runs on schedule

---

## Phase 1: Pre-Launch Audit (Week 1)

### Smoke Testing
- [ ] 0.1 Run full smoke test checklist (SMOKE_TEST_CHECKLIST.md)
- [ ] 0.2 Document all failed items with error messages
- [ ] 0.3 Fix critical blockers (auth, progress, alerts)
- [ ] 0.4 Fix high-priority issues (UI, edge cases)
- [ ] 0.5 Re-run smoke test to verify fixes

### Mobile & UX
- [ ] 0.3a Test on Android phone (Chrome)
- [ ] 0.3b Test on iPhone (Safari)
- [ ] 0.3c Verify 44px touch targets on all buttons
- [ ] 0.3d Test PIN numpad usability on mobile

### Code Quality
- [ ] 0.4 Run `php artisan test --testsuite=Feature`
- [ ] 0.5 Fix any failing tests
- [ ] 0.6 Run `vendor/bin/pint` for code formatting
- [ ] 0.7 Check for SQL injection vulnerabilities
- [ ] 0.8 Check for XSS vulnerabilities
- [ ] 0.9 Verify CSRF protection on all forms
- [ ] 0.10 Check session timeout behavior

### Performance
- [ ] 0.11 Profile Owner dashboard load time
- [ ] 0.12 Profile Worker dashboard load time
- [ ] 0.13 Check for N+1 queries
- [ ] 0.14 Verify eager loading in place

---

## Phase 1: Infrastructure & Deployment (Week 2)

### Hosting Setup
- [ ] 1.1 Decide: Hostinger shared vs VPS
- [ ] 1.2 Setup hosting account
- [ ] 1.3 Configure domain (app.pogrid.id)
- [ ] 1.4 Install SSL certificate
- [ ] 1.5 Configure PHP 8.3 + extensions

### Database
- [ ] 1.6 Setup Neon PostgreSQL production instance
- [ ] 1.7 Create production database
- [ ] 1.8 Configure database credentials
- [ ] 1.9 Run migrations: `php artisan migrate --force`
- [ ] 1.10 Seed demo data: `php artisan db:seed`

### Services
- [ ] 1.11 Create Pusher account (free tier)
- [ ] 1.12 Configure Pusher keys in .env
- [ ] 1.13 Test Pusher connection
- [ ] 1.14 Setup cron job: `* * * * * cd /path && php artisan queue:work --stop-when-empty`
- [ ] 1.15 Setup cron job: `* * * * * cd /path && php artisan pogrid:evaluate-timelines`

### Environment
- [ ] 1.16 Create .env.production
- [ ] 1.17 Set APP_ENV=production
- [ ] 1.18 Set APP_DEBUG=false
- [ ] 1.19 Configure mail (SMTP or Mailgun)
- [ ] 1.20 Test email delivery

### Monitoring
- [ ] 1.21 Setup Sentry or similar error tracking
- [ ] 1.22 Setup uptime monitoring (UptimeRobot)
- [ ] 1.23 Configure log rotation
- [ ] 1.24 Setup automated backups (DB + files)

---

## Phase 2: Authentication & Registration (Week 2-3)

### Registration Flow
- [ ] 2.1 Test `/register` page loads correctly
- [ ] 2.2 Test form validation (required fields, email format)
- [ ] 2.3 Test successful registration creates tenant + user
- [ ] 2.4 Test email verification sent
- [ ] 2.5 Test email verification link works
- [ ] 2.6 Test redirect to onboarding after verification

### Login Flow (Office)
- [ ] 2.7 Test `/login` page loads correctly
- [ ] 2.8 Test login with valid credentials
- [ ] 2.9 Test login with invalid credentials
- [ ] 2.10 Test session persistence across refresh
- [ ] 2.11 Test logout destroys session

### PIN Login (Floor)
- [ ] 2.12 Test `/c/teknik-mandiri` loads name selection
- [ ] 2.13 Test PIN numpad appears after name selection
- [ ] 2.14 Test correct PIN redirects to dashboard
- [ ] 2.15 Test wrong PIN shows error
- [ ] 2.16 Test 5 wrong attempts triggers throttle

### Security
- [ ] 2.17 Test office role cannot PIN login
- [ ] 2.18 Test floor role cannot access office routes
- [ ] 2.19 Test CSRF token present on all forms
- [ ] 2.20 Test password is bcrypt hashed
- [ ] 2.21 Test PIN is bcrypt hashed

### Password Reset
- [ ] 2.22 Test forgot password page loads
- [ ] 2.23 Test reset link sent to email
- [ ] 2.24 Test reset link works
- [ ] 2.25 Test new password can be used to login

---

## Phase 3: Onboarding Flow (Week 3)

### Onboarding Wizard
- [ ] 3.1 Design onboarding flow (wireframe)
- [ ] 3.2 Create onboarding page/component
- [ ] 3.3 Step 1: Company info form (name, slug, industry)
- [ ] 3.4 Step 2: Add first workers (name, role, PIN)
- [ ] 3.5 Step 3: Create first PO (template selection)
- [ ] 3.6 Step 4: Worker PIN login test
- [ ] 3.7 Step 5: Success screen + next steps

### Quickstart Guide
- [ ] 3.8 Write quickstart documentation
- [ ] 3.9 Include screenshots for each step
- [ ] 3.10 Add FAQ section
- [ ] 3.11 Link to guide from onboarding

### In-App Help
- [ ] 3.12 Add tooltips for first-time users
- [ ] 3.13 Add contextual help buttons
- [ ] 3.14 Add "What's this?" popups for complex features

---

## Phase 4: Subscription & Payment (Week 3-4)

### Subscription Model
- [ ] 4.1 Define pricing tiers (Basic, Pro, Enterprise?)
- [ ] 4.2 Define feature limits per tier
- [ ] 4.3 Define trial period (30 days)
- [ ] 4.4 Document subscription logic

### Database
- [ ] 4.5 Create subscriptions table migration
- [ ] 4.6 Create payments table migration
- [ ] 4.7 Add subscription_status to tenants table
- [ ] 4.8 Add trial_ends_at to tenants table

### Backend Logic
- [ ] 4.9 Implement trial period check middleware
- [ ] 4.10 Block access when trial expired
- [ ] 4.11 Implement subscription creation
- [ ] 4.12 Implement subscription renewal
- [ ] 4.13 Implement subscription cancellation

### Payment Gateway
- [ ] 4.14 Choose provider (Midtrans or Xendit)
- [ ] 4.15 Create account and get API keys
- [ ] 4.16 Integrate payment gateway
- [ ] 4.17 Handle payment success webhook
- [ ] 4.18 Handle payment failure webhook
- [ ] 4.19 Handle subscription renewal webhook

### Frontend
- [ ] 4.20 Create billing page
- [ ] 4.21 Show current plan and status
- [ ] 4.22 Show payment history
- [ ] 4.23 Add "Upgrade" button
- [ ] 4.24 Add "Cancel Subscription" button

### Email
- [ ] 4.25 Trial expiry reminder (3 days before)
- [ ] 4.26 Payment success confirmation
- [ ] 4.27 Payment failure notification
- [ ] 4.28 Subscription renewal reminder

---

## Phase 5: UI/UX Polish (Week 4)

### Mobile
- [ ] 5.1 Test all pages on mobile viewport
- [ ] 5.2 Fix any overflow/scroll issues
- [ ] 5.3 Verify buttons are tappable (44px+)
- [ ] 5.4 Test landscape mode
- [ ] 5.5 Test dark mode (if applicable)

### Loading States
- [ ] 5.6 Add skeleton loaders for dashboard
- [ ] 5.7 Add spinners for form submissions
- [ ] 5.8 Add loading state for data fetches

### Error States
- [ ] 5.9 Test 404 page shows correctly
- [ ] 5.10 Test 403 page shows correctly
- [ ] 5.11 Test 500 page shows correctly
- [ ] 5.12 Add empty state for no data
- [ ] 5.13 Add offline detection

### Feedback
- [ ] 5.14 Success toast after form submit
- [ ] 5.15 Error toast on failure
- [ ] 5.16 Confirmation dialog for destructive actions
- [ ] 5.17 Form validation messages

### Accessibility
- [ ] 5.18 Test keyboard navigation
- [ ] 5.19 Add ARIA labels where needed
- [ ] 5.20 Test with screen reader (basic)

---

## Phase 6: Testing & QA (Week 4-5)

### Functional Testing
- [ ] 6.1 Full smoke test re-run (all items)
- [ ] 6.2 Test complete PO lifecycle (PENDING → CLOSED)
- [ ] 6.3 Test multi-item PO
- [ ] 6.4 Test concurrent worker updates
- [ ] 6.5 Test QC rework cycle
- [ ] 6.6 Test delivery tracking
- [ ] 6.7 Test finance invoice flow

### Cross-Browser
- [ ] 6.8 Test on Chrome (latest)
- [ ] 6.9 Test on Firefox (latest)
- [ ] 6.10 Test on Safari (latest)
- [ ] 6.11 Test on Edge (latest)

### Mobile Devices
- [ ] 6.12 Test on Android (Samsung/Google)
- [ ] 6.13 Test on iPhone (iOS 16+)
- [ ] 6.14 Test on tablet (iPad)

### Performance
- [ ] 6.15 Load test with 10 concurrent users
- [ ] 6.16 Load test with 50 concurrent users
- [ ] 6.17 Measure page load times
- [ ] 6.18 Optimize if needed

### Security
- [ ] 6.19 Penetration test (basic)
- [ ] 6.20 Verify all inputs sanitized
- [ ] 6.21 Verify all outputs escaped
- [ ] 6.22 Verify session security

### Data Integrity
- [ ] 6.23 Verify progress calculations correct
- [ ] 6.24 Verify PO status transitions correct
- [ ] 6.25 Verify alert creation/resolution
- [ ] 6.26 Verify delivery tracking correct
- [ ] 6.27 Verify invoice/payment tracking correct

---

## Phase 7: Soft Launch (Week 5)

### First Customer
- [ ] 7.1 Contact former employer
- [ ] 7.2 Schedule demo/presentation
- [ ] 7.3 Negotiate terms (trial or paid)
- [ ] 7.4 Onboard first customer (manual)
- [ ] 7.5 Train their team (1-2 sessions)

### Monitoring
- [ ] 7.6 Monitor error logs daily
- [ ] 7.7 Monitor usage patterns
- [ ] 7.8 Collect feedback weekly
- [ ] 7.9 Fix critical issues immediately

### Iteration
- [ ] 7.10 Prioritize feedback items
- [ ] 7.11 Implement quick wins
- [ ] 7.12 Document lessons learned

---

## Phase 8: Marketing Launch (Week 6)

### Marketing Site
- [ ] 8.1 Deploy pogrid.id (marketing)
- [ ] 8.2 Configure DNS
- [ ] 8.3 Setup Google Analytics
- [ ] 8.4 Setup conversion tracking

### Content
- [ ] 8.5 Write launch blog post
- [ ] 8.6 Create social media posts
- [ ] 8.7 Prepare demo video

### Distribution
- [ ] 8.8 Post in WhatsApp communities
- [ ] 8.9 Post in LinkedIn
- [ ] 8.10 Post in relevant forums
- [ ] 8.11 Submit to Product Hunt (optional)

### Monitoring
- [ ] 8.12 Track signups daily
- [ ] 8.13 Track conversion rate
- [ ] 8.14 Monitor support requests
- [ ] 8.15 Iterate based on data

---

## Summary

| Phase | Tasks | Total Hours (est) |
|-------|-------|-------------------|
| Phase 0: Audit | 15 | 16-24 hrs |
| Phase 1: Infrastructure | 20 | 16-20 hrs |
| Phase 2: Auth | 25 | 12-16 hrs |
| Phase 3: Onboarding | 14 | 16-20 hrs |
| Phase 4: Payment | 28 | 24-32 hrs |
| Phase 5: UI/UX | 20 | 16-20 hrs |
| Phase 6: Testing | 27 | 20-24 hrs |
| Phase 7: Soft Launch | 12 | 16-20 hrs |
| Phase 8: Marketing | 15 | 12-16 hrs |
| **TOTAL** | **176** | **148-192 hrs** |

**At 2 hrs/day**: ~75-96 working days = **11-14 weeks**

**Optimistic (with focus)**: 6-8 weeks
**Realistic**: 10-12 weeks
**Conservative**: 14-16 weeks

---

*Todo list generated: July 29, 2026*
*Source: LAUNCH_PLAN.md + SPEC.md + SMOKE_TEST_CHECKLIST.md*
