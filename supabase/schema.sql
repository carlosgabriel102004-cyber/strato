-- Strato database schema (already applied to the Supabase project).
-- Kept here as reference / to recreate the database.

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  credit_limit numeric(14,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  amount numeric(14,2) not null, -- positive = income, negative = expense
  description text not null default '',
  account text not null default '',
  payment_method text not null default '',
  due_date date, -- explicit card invoice due date (optional)
  category text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, date);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  service_name text not null,
  monthly_price numeric(14,2) not null default 0,
  personal_monthly_price numeric(14,2),
  payment_method text not null default '',
  renewal_day smallint check (renewal_day between 1 and 31),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.balance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  name text not null, -- e.g. 'cofrinho pj nu (100%)'; the % is the CDI rate used in projections
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  account_id uuid not null references public.balance_accounts(id) on delete cascade,
  recorded_on date not null,
  amount numeric(14,2),
  created_at timestamptz not null default now(),
  unique (account_id, recorded_on)
);

create table public.debtor_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  borrower_name text not null,
  description text not null default '',
  amount numeric(14,2) not null default 0,
  movement text not null check (movement in ('pegou','pagou')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  ticker text not null,
  name text not null default '',
  asset_class text not null default '', -- STOCK / REIT / ETF
  shares numeric(18,6) not null default 0,
  average_price_usd numeric(14,4) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Row level security: each user only sees and edits their own rows
do $$
declare t text;
begin
  foreach t in array array['cards','transactions','subscriptions','balance_accounts','balance_snapshots','debtor_entries','investments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create index %I on public.%I (user_id)', t || '_user_idx', t);
    execute format($p$create policy "own rows select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "own rows update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)$p$, t);
  end loop;
end $$;

-- Imported rows start without an owner (user_id null) and are claimed by the
-- owner's account the first time it signs in.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.owner_claim (email text primary key);
alter table private.owner_claim enable row level security;

create or replace function public.claim_imported_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.owner_claim c where lower(c.email) = lower(new.email)) then
    update public.cards set user_id = new.id where user_id is null;
    update public.transactions set user_id = new.id where user_id is null;
    update public.subscriptions set user_id = new.id where user_id is null;
    update public.balance_accounts set user_id = new.id where user_id is null;
    update public.balance_snapshots set user_id = new.id where user_id is null;
    update public.debtor_entries set user_id = new.id where user_id is null;
    update public.investments set user_id = new.id where user_id is null;
    delete from private.owner_claim where lower(email) = lower(new.email);
  end if;
  return new;
end;
$$;
revoke execute on function public.claim_imported_rows() from public, anon, authenticated;

create trigger on_auth_user_created_claim
  after insert on auth.users
  for each row execute function public.claim_imported_rows();

-- Sign-ups restricted to an allowlist (existing accounts keep signing in).
-- To allow someone: insert into private.signup_allowlist (email) values ('pessoa@gmail.com');
create table private.signup_allowlist (email text primary key);
alter table private.signup_allowlist enable row level security;
insert into private.signup_allowlist (email) values ('carlosgabriel10.2004@gmail.com');

create or replace function public.enforce_signup_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from private.signup_allowlist a where lower(a.email) = lower(new.email)) then
    raise exception 'Cadastro de novas contas desativado no Strato';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_signup_allowlist() from public, anon, authenticated;

create trigger before_auth_user_created_allowlist
  before insert on auth.users
  for each row execute function public.enforce_signup_allowlist();

-- 'reembolso' = only offsets a shared cost; kept for control, not counted as income/expense
alter table public.transactions
  add column kind text not null default 'normal' check (kind in ('normal', 'reembolso', 'aporte'));

-- Card invoices: automatic debit flag and paid invoices per month
alter table public.cards add column auto_pay boolean not null default false;
create table public.card_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  card_name text not null,
  month text not null, -- e.g. 'Novembro 2026'
  paid_at timestamptz not null default now(),
  unique (user_id, card_name, month)
);
create index card_invoice_payments_user_idx on public.card_invoice_payments (user_id);
alter table public.card_invoice_payments enable row level security;
create policy "own rows select" on public.card_invoice_payments for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.card_invoice_payments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.card_invoice_payments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows delete" on public.card_invoice_payments for delete to authenticated using ((select auth.uid()) = user_id);

-- Currency exchanges (BRL -> USD) used to compute the average dollar rate
create table public.currency_exchanges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  brl_amount numeric(14,2) not null,
  brl_after_spread numeric(14,2),
  usd_amount numeric(14,2) not null,
  fees_brl numeric(14,2) not null default 0,
  rate numeric(12,6),
  provider text not null default '',
  created_at timestamptz not null default now()
);
create index currency_exchanges_user_idx on public.currency_exchanges (user_id, date);
alter table public.currency_exchanges enable row level security;
create policy "own rows select" on public.currency_exchanges for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.currency_exchanges for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.currency_exchanges for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows delete" on public.currency_exchanges for delete to authenticated using ((select auth.uid()) = user_id);

-- Accounts that were closed: hidden from new balance entries, history kept
alter table public.balance_accounts add column archived boolean not null default false;
