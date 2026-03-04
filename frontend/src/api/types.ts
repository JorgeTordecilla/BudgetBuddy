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

export type RegisterRequest = {
  username: string;
  password: string;
  currency_code: string;
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
export type TransactionMood = "happy" | "neutral" | "sad" | "anxious" | "bored";

export type Transaction = {
  id: string;
  type: TransactionType;
  account_id: string;
  category_id: string;
  income_source_id?: string | null;
  amount_cents: number;
  date: string;
  merchant?: string | null;
  note?: string | null;
  mood?: TransactionMood | null;
  is_impulse?: boolean | null;
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
  income_source_id?: string | null;
  amount_cents: number;
  date: string;
  merchant?: string;
  note?: string;
  mood?: TransactionMood;
  is_impulse?: boolean;
};

export type TransactionUpdate = {
  type?: TransactionType;
  account_id?: string;
  category_id?: string;
  income_source_id?: string | null;
  amount_cents?: number;
  date?: string;
  merchant?: string | null;
  note?: string | null;
  mood?: TransactionMood | null;
  is_impulse?: boolean | null;
  archived_at?: string | null;
};

export type TransactionImportMode = "partial" | "all_or_nothing";

export type TransactionImportRequest = {
  mode: TransactionImportMode;
  items: TransactionCreate[];
};

export type TransactionImportFailure = {
  index: number;
  message: string;
  problem?: ProblemDetails;
};

export type TransactionImportResult = {
  created_count: number;
  failed_count: number;
  failures: TransactionImportFailure[];
};

export type Budget = {
  id: string;
  month: string;
  category_id: string;
  limit_cents: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetListResponse = {
  items: Budget[];
};

export type BudgetCreate = {
  month: string;
  category_id: string;
  limit_cents: number;
};

export type BudgetUpdate = {
  month?: string;
  category_id?: string;
  limit_cents?: number;
  archived_at?: string | null;
};

export type Bill = {
  id: string;
  name: string;
  due_day: number;
  budget_cents: number;
  category_id: string;
  account_id: string;
  note?: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BillCreate = {
  name: string;
  due_day: number;
  budget_cents: number;
  category_id: string;
  account_id: string;
  note?: string | null;
  is_active?: boolean;
};

export type BillUpdate = {
  name?: string;
  due_day?: number;
  budget_cents?: number;
  category_id?: string;
  account_id?: string;
  note?: string | null;
  is_active?: boolean;
};

export type BillListResponse = {
  items: Bill[];
};

export type BillPaymentCreate = {
  month: string;
  actual_cents?: number;
};

export type BillPaymentOut = {
  id: string;
  bill_id: string;
  month: string;
  actual_cents: number;
  transaction_id: string;
  paid_at: string;
};

export type BillMonthlyStatus = "paid" | "pending" | "overdue";

export type BillMonthlyStatusItem = {
  bill_id: string;
  name: string;
  due_day: number;
  due_date: string;
  budget_cents: number;
  status: BillMonthlyStatus;
  actual_cents: number | null;
  transaction_id: string | null;
  diff_cents: number | null;
};

export type BillMonthlyStatusSummary = {
  total_budget_cents: number;
  total_paid_cents: number;
  total_pending_cents: number;
  paid_count: number;
  pending_count: number;
};

export type BillMonthlyStatusOut = {
  month: string;
  summary: BillMonthlyStatusSummary;
  items: BillMonthlyStatusItem[];
};

export type SavingsGoalStatus = "active" | "completed" | "cancelled";

export type SavingsGoal = {
  id: string;
  name: string;
  target_cents: number;
  account_id: string;
  category_id: string;
  deadline: string | null;
  note: string | null;
  status: SavingsGoalStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  saved_cents: number;
  remaining_cents: number;
  progress_pct: number;
};

export type SavingsGoalCreate = {
  name: string;
  target_cents: number;
  account_id: string;
  category_id: string;
  deadline?: string | null;
  note?: string | null;
};

export type SavingsGoalUpdate = {
  name?: string;
  target_cents?: number;
  account_id?: string;
  category_id?: string;
  deadline?: string | null;
  note?: string | null;
};

export type SavingsGoalListResponse = {
  items: SavingsGoal[];
};

export type SavingsContributionCreate = {
  amount_cents: number;
  note?: string | null;
};

export type SavingsContribution = {
  id: string;
  goal_id: string;
  amount_cents: number;
  transaction_id: string;
  note: string | null;
  contributed_at: string;
};

export type SavingsGoalDetail = SavingsGoal & {
  contributions: SavingsContribution[];
};

export type SavingsSummary = {
  active_count: number;
  completed_count: number;
  total_target_cents: number;
  total_saved_cents: number;
  total_remaining_cents: number;
  overall_progress_pct: number;
};

export type AnalyticsByMonthItem = {
  month: string;
  income_total_cents: number;
  expense_total_cents: number;
  expected_income_cents?: number;
  actual_income_cents?: number;
  rollover_in_cents?: number;
  budget_spent_cents?: number;
  budget_limit_cents?: number;
};

export type AnalyticsByMonthResponse = {
  items: AnalyticsByMonthItem[];
};

export type AnalyticsByCategoryItem = {
  category_id: string;
  category_name: string;
  category_type: "income" | "expense";
  income_total_cents: number;
  expense_total_cents: number;
  budget_spent_cents?: number;
  budget_limit_cents?: number;
};

export type AnalyticsByCategoryResponse = {
  items: AnalyticsByCategoryItem[];
};

export type ImpulseSummaryCategory = {
  category_id: string;
  category_name: string;
  count: number;
};

export type ImpulseSummary = {
  impulse_count: number;
  intentional_count: number;
  untagged_count: number;
  top_impulse_categories: ImpulseSummaryCategory[];
};

export type IncomeFrequency = "monthly";

export type IncomeSource = {
  id: string;
  name: string;
  expected_amount_cents: number;
  frequency: IncomeFrequency;
  is_active: boolean;
  note?: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IncomeSourceListResponse = {
  items: IncomeSource[];
};

export type IncomeSourceCreate = {
  name: string;
  expected_amount_cents: number;
  frequency: IncomeFrequency;
  is_active: boolean;
  note?: string;
};

export type IncomeSourceUpdate = {
  name?: string;
  expected_amount_cents?: number;
  frequency?: IncomeFrequency;
  is_active?: boolean;
  note?: string | null;
  archived_at?: string | null;
};

export type IncomeSourceAnalyticsRow = {
  income_source_id: string | null;
  income_source_name: string;
  expected_income_cents: number;
  actual_income_cents: number;
};

export type IncomeAnalyticsItem = {
  month: string;
  expected_income_cents: number;
  actual_income_cents: number;
  rows: IncomeSourceAnalyticsRow[];
};

export type IncomeAnalyticsResponse = {
  items: IncomeAnalyticsItem[];
};

export type RolloverPreview = {
  month: string;
  surplus_cents: number;
  already_applied: boolean;
  applied_transaction_id: string | null;
};

export type RolloverApplyRequest = {
  source_month: string;
  account_id: string;
  category_id: string;
};

export type RolloverApplyResponse = {
  source_month: string;
  target_month: string;
  transaction_id: string;
  amount_cents: number;
};
