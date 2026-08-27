
-- Lending Management System - Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  lender_name text,
  business_name text,
  mobile_number text,
  address text,
  default_interest_rate numeric(5,2) default 10.00 check (default_interest_rate >=0 and default_interest_rate <=100),
  currency text default 'PHP',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- BORROWERS
create table if not exists public.borrowers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  mobile_number text not null,
  address text,
  email text,
  notes text,
  date_added date default current_date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index idx_borrowers_user_id on public.borrowers(user_id);
create index idx_borrowers_full_name on public.borrowers(full_name);

-- LOANS
create table if not exists public.loans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  borrower_id uuid not null references public.borrowers(id) on delete cascade,
  principal numeric(12,2) not null check (principal > 0),
  interest_rate numeric(5,2) not null check (interest_rate >=0 and interest_rate <=100),
  interest_amount numeric(12,2) not null check (interest_amount >=0),
  total_payable numeric(12,2) not null check (total_payable >0),
  processing_fee numeric(12,2) default 0 check (processing_fee >=0),
  duration_months integer not null check (duration_months between 1 and 12),
  start_date date not null,
  payment_frequency text not null check (payment_frequency in ('Weekly','Twice a Month','Monthly')),
  num_payments integer not null check (num_payments >0),
  payment_amount numeric(12,2) not null check (payment_amount >0),
  remaining_balance numeric(12,2) not null check (remaining_balance >=0),
  status text not null default 'Active' check (status in ('Pending','Active','Completed','Overdue','Cancelled')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index idx_loans_user_id on public.loans(user_id);
create index idx_loans_borrower_id on public.loans(borrower_id);
create index idx_loans_status on public.loans(status);

-- PAYMENT SCHEDULES
create table if not exists public.payment_schedules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  payment_number integer not null,
  due_date date not null,
  expected_amount numeric(12,2) not null check (expected_amount >0),
  amount_paid numeric(12,2) default 0 check (amount_paid >=0),
  remaining_amount numeric(12,2) not null,
  status text not null default 'Upcoming' check (status in ('Upcoming','Due Today','Partially Paid','Paid','Overdue')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(loan_id, payment_number)
);
create index idx_ps_user_id on public.payment_schedules(user_id);
create index idx_ps_loan_id on public.payment_schedules(loan_id);
create index idx_ps_due_date on public.payment_schedules(due_date);
create index idx_ps_status on public.payment_schedules(status);

-- PAYMENTS
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  schedule_id uuid not null references public.payment_schedules(id) on delete cascade,
  amount_paid numeric(12,2) not null check (amount_paid >0),
  payment_date date not null,
  payment_method text not null check (payment_method in ('Cash','GCash','Bank Transfer','Other')),
  reference_number text,
  notes text,
  created_at timestamp with time zone default now()
);
create index idx_payments_user_id on public.payments(user_id);
create index idx_payments_loan_id on public.payments(loan_id);
create index idx_payments_schedule_id on public.payments(schedule_id);

-- SMS REMINDERS
create table if not exists public.sms_reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  borrower_id uuid references public.borrowers(id) on delete set null,
  loan_id uuid references public.loans(id) on delete set null,
  schedule_id uuid references public.payment_schedules(id) on delete set null,
  phone_number text not null,
  message text not null,
  status text default 'Generated' check (status in ('Generated','Sent','Failed','Pending Provider')),
  created_at timestamp with time zone default now()
);
create index idx_sms_user_id on public.sms_reminders(user_id);

-- Function to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers
drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_borrowers on public.borrowers;
create trigger set_updated_at_borrowers before update on public.borrowers for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_loans on public.loans;
create trigger set_updated_at_loans before update on public.loans for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_ps on public.payment_schedules;
create trigger set_updated_at_ps before update on public.payment_schedules for each row execute function public.handle_updated_at();

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, lender_name, business_name)
  values (new.id, new.email, 'My Lending Business');
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.borrowers enable row level security;
alter table public.loans enable row level security;
alter table public.payment_schedules enable row level security;
alter table public.payments enable row level security;
alter table public.sms_reminders enable row level security;

-- RLS Policies - profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- borrowers
drop policy if exists "Users can manage own borrowers" on public.borrowers;
create policy "Users can manage own borrowers" on public.borrowers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- loans
drop policy if exists "Users can manage own loans" on public.loans;
create policy "Users can manage own loans" on public.loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- payment_schedules
drop policy if exists "Users can manage own schedules" on public.payment_schedules;
create policy "Users can manage own schedules" on public.payment_schedules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- payments
drop policy if exists "Users can manage own payments" on public.payments;
create policy "Users can manage own payments" on public.payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sms_reminders
drop policy if exists "Users can manage own sms" on public.sms_reminders;
create policy "Users can manage own sms" on public.sms_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);