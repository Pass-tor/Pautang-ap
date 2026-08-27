
# LendManager - Personal Lending Management System

Mobile-first, professional lending system built for **GitHub Pages + Supabase Free Plan**. No PHP, MySQL, Node server, or paid backend.

System by **Edwin Macatangay Perez**

## Features

- **Auth**: Login, Register, Logout, Forgot password, Protected routes, Session persistence
- **Dashboard**: Total Capital, Active Loans, Amount Lent, Collected, Outstanding, Today's Due, Overdue, Borrowers, Monthly collections chart
- **Borrowers**: CRUD, Search, View profile with loan history, totals
- **Loans**: Add loan with transparent interest calc, Auto payment schedule (Weekly, Twice a Month, Monthly), Duration 1-12 months
- **Payments**: Record payment with method, Prevent overpayment unless confirmed, Auto update balances and statuses
- **Due Payments**: Today, Upcoming 7 days, Overdue with SMS reminder button
- **SMS Reminder**: Generates message "Hello [Name], reminder payment ₱[Amount] due [Date]". Stores in sms_reminders. Shows "SMS provider not configured" until Edge Function added.
- **Reports**: Daily/Weekly/Monthly collections, Outstanding, Overdue, Completed, Interest Earned, CSV export, Printable
- **Settings**: Lender name, business name, mobile, address, default interest, currency. Supabase config stored locally.
- **Security**: Supabase RLS, only anon key in frontend, UUIDs, numeric(12,2) for money, never float for storage.

## Supabase Setup (Exact Steps)

1. Create account at supabase.com
2. New Project → Free Plan → set DB password
3. Left menu → SQL Editor → New Query → Paste entire `database/schema.sql` → Run
4. Authentication → Providers → Enable Email
5. Authentication → URL Configuration → Site URL: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
6. Project Settings → API → Copy **Project URL** and **anon public** key (NOT service_role)
7. In app Login page, paste URL and anon key in config box (saved to localStorage) OR edit `js/supabase.js` constants
8. Test: Register → Login → Add borrower → Add loan → Record payment

## Database Schema

Tables: profiles (id=auth.users.id), borrowers (user_id), loans (user_id, borrower_id), payment_schedules (user_id, loan_id), payments (user_id, loan_id, schedule_id), sms_reminders

All tables have `user_id` for RLS, UUID PK, numeric for money, created_at/updated_at, indexes, foreign keys, constraints.

RLS policies: `FOR ALL USING (auth.uid() = user_id)` for borrower/loan/schedule/payment/sms, and profile policies for own profile.

## GitHub Pages Deployment

1. Create repo, push all files (root must contain index.html)
2. GitHub → Settings → Pages → Source: Deploy from branch → main / root
3. Wait 1-2 mins, open `https://USERNAME.github.io/REPO/`
4. On login page, configure Supabase URL + anon key

Structure:
```
/
├── index.html, login.html, register.html, dashboard.html, borrowers.html, borrower-view.html, loans.html, loan-view.html, payments.html, due-payments.html, reports.html, settings.html
├── css/style.css
├── js/supabase.js, auth.js, dashboard.js, borrowers.js, loans.js, payments.js, reports.js, settings.js
├── database/schema.sql
└── README.md
```

## Interest Calculation (Transparent)

```
Interest Amount = Principal * (Rate/100)
Total Payable = Principal + Interest + Processing Fee
Payment Amount = Total / NumPayments
NumPayments:
  Monthly = durationMonths
  Twice a Month = durationMonths*2
  Weekly = durationMonths*4
```

## Payment Schedule Generation

- Monthly: add 1 month
- Twice a Month: add 15 days (safe for month lengths)
- Weekly: add 7 days
- Status logic: Paid if remaining <=0.01, Partially Paid if amount_paid>0, Overdue if due_date < today and not Paid, Due Today if due_date == today

## SMS Architecture (Future Integration)

1. Current: generate message, save to sms_reminders with status Pending Provider
2. Future: Create Supabase Edge Function `send-sms` that reads sms_reminders where status=Pending Provider and calls Twilio/Semaphore API
3. Edge Function should use service_role only server-side, never expose secret to frontend
4. Update sms_reminders status to Sent/Failed

## Security

- NEVER put service_role key in frontend
- RLS enabled on all tables
- Validate: required fields, phone pattern, positive amounts, rate 0-100, valid dates
- Prevent negative amounts via DB CHECK constraints
- Do not delete payment history; use reversal payment instead (implemented as new payment with negative logic prevented, so adjustment via edit only by admin)

## Troubleshooting

- "No data": check RLS, ensure user_id matches auth.uid(), check config URL/key
- Auth not persisting: ensure supabase-js CDN loaded, check localStorage
- Schedule wrong dates: check Twice a Month = 15 days, handles 28-31 day months safely
- GitHub Pages 404: ensure index.html at root, Pages source main/root

## Currency

Philippine Peso formatting: ₱10,000.00 via toLocaleString('en-PH')

## Footer Credit

Subtle footer on all pages: "System by Edwin Macatangay Perez"

## License

MIT - Free for personal use
