export type User = {
  id: string;
  username: string;
  currency_code: string;
};

export type AuthSessionResponse = {
  user: User;
  access_token: string;
  access_token_expires_in: number;
};

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

export type AccountType = "cash" | "debit" | "credit" | "bank";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  initial_balance_cents: number;
  note?: string | null;
  archived_at: string | null;
};

export type AccountsListResponse = {
  items: Account[];
  next_cursor: string | null;
};

export type AccountCreate = {
  name: string;
  type: AccountType;
  initial_balance_cents: number;
  note?: string;
};

export type AccountUpdate = {
  name?: string;
  type?: AccountType;
  initial_balance_cents?: number;
  note?: string | null;
  archived_at?: string | null;
};

export type CategoryType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  note?: string | null;
  archived_at: string | null;
};

export type CategoriesListResponse = {
  items: Category[];
  next_cursor: string | null;
};

export type CategoryCreate = {
  name: string;
  type: CategoryType;
  note?: string;
};

export type CategoryUpdate = {
  name?: string;
  note?: string | null;
  archived_at?: string | null;
};

export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TransactionType;
  account_id: string;
  category_id: string;
  amount_cents: number;
  date: string;
  merchant?: string | null;
  note?: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionsListResponse = {
  items: Transaction[];
  next_cursor: string | null;
};

export type TransactionCreate = {
  type: TransactionType;
  account_id: string;
  category_id: string;
  amount_cents: number;
  date: string;
  merchant?: string;
  note?: string;
};

export type TransactionUpdate = {
  type?: TransactionType;
  account_id?: string;
  category_id?: string;
  amount_cents?: number;
  date?: string;
  merchant?: string | null;
  note?: string | null;
  archived_at?: string | null;
};
