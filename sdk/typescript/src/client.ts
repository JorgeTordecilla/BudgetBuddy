/* AUTO-GENERATED FILE. DO NOT EDIT.
 * source: backend/openapi.yaml
 * generator: bebudget-ts-sdkgen@1.0.0
 * spec_sha256: a8222dc57383f30508cb423e46f3761802b63c9b8b9ce009281fcdad55f15f2f
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export interface SDKConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

export class BeBudgetClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(cfg: SDKConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.defaultHeaders = cfg.defaultHeaders ?? {};
  }

  private async request(method: HttpMethod, path: string, body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    const finalHeaders: Record<string, string> = { ...this.defaultHeaders, ...(headers ?? {}) };
    if (body !== undefined && !finalHeaders['content-type']) {
      finalHeaders['content-type'] = 'application/vnd.bebudget.v1+json';
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return res;
  }

  async getHealthz(path: string = '/healthz', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getReadyz(path: string = '/readyz', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postAuthRegister(path: string = '/auth/register', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async postAuthLogin(path: string = '/auth/login', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async postAuthRefresh(path: string = '/auth/refresh', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async postAuthLogout(path: string = '/auth/logout', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getMe(path: string = '/me', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getAccounts(path: string = '/accounts', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postAccounts(path: string = '/accounts', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getAccountsAccountId(path: string = '/accounts/{account_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async patchAccountsAccountId(path: string = '/accounts/{account_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('PATCH', path, body, headers);
  }

  async deleteAccountsAccountId(path: string = '/accounts/{account_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async getCategories(path: string = '/categories', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postCategories(path: string = '/categories', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getCategoriesCategoryId(path: string = '/categories/{category_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async patchCategoriesCategoryId(path: string = '/categories/{category_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('PATCH', path, body, headers);
  }

  async deleteCategoriesCategoryId(path: string = '/categories/{category_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async getIncomeSources(path: string = '/income-sources', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postIncomeSources(path: string = '/income-sources', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getIncomeSourcesIncomeSourceId(path: string = '/income-sources/{income_source_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async patchIncomeSourcesIncomeSourceId(path: string = '/income-sources/{income_source_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('PATCH', path, body, headers);
  }

  async deleteIncomeSourcesIncomeSourceId(path: string = '/income-sources/{income_source_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async getTransactions(path: string = '/transactions', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postTransactions(path: string = '/transactions', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async postTransactionsImport(path: string = '/transactions/import', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getTransactionsExport(path: string = '/transactions/export', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getTransactionsTransactionId(path: string = '/transactions/{transaction_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async patchTransactionsTransactionId(path: string = '/transactions/{transaction_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('PATCH', path, body, headers);
  }

  async deleteTransactionsTransactionId(path: string = '/transactions/{transaction_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async getBills(path: string = '/bills', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postBills(path: string = '/bills', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getBillsMonthlyStatus(path: string = '/bills/monthly-status', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getBillsBillId(path: string = '/bills/{bill_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async patchBillsBillId(path: string = '/bills/{bill_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('PATCH', path, body, headers);
  }

  async deleteBillsBillId(path: string = '/bills/{bill_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async postBillsBillIdPayments(path: string = '/bills/{bill_id}/payments', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async deleteBillsBillIdPaymentsMonth(path: string = '/bills/{bill_id}/payments/{month}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async getSavingsGoals(path: string = '/savings-goals', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postSavingsGoals(path: string = '/savings-goals', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getSavingsGoalsSummary(path: string = '/savings-goals/summary', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getSavingsGoalsGoalId(path: string = '/savings-goals/{goal_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async patchSavingsGoalsGoalId(path: string = '/savings-goals/{goal_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('PATCH', path, body, headers);
  }

  async deleteSavingsGoalsGoalId(path: string = '/savings-goals/{goal_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async postSavingsGoalsGoalIdComplete(path: string = '/savings-goals/{goal_id}/complete', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async postSavingsGoalsGoalIdCancel(path: string = '/savings-goals/{goal_id}/cancel', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async postSavingsGoalsGoalIdContributions(path: string = '/savings-goals/{goal_id}/contributions', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async deleteSavingsGoalsGoalIdContributionsContributionId(path: string = '/savings-goals/{goal_id}/contributions/{contribution_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async getBudgets(path: string = '/budgets', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postBudgets(path: string = '/budgets', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getBudgetsBudgetId(path: string = '/budgets/{budget_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async patchBudgetsBudgetId(path: string = '/budgets/{budget_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('PATCH', path, body, headers);
  }

  async deleteBudgetsBudgetId(path: string = '/budgets/{budget_id}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, body, headers);
  }

  async getAudit(path: string = '/audit', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getAnalyticsByMonth(path: string = '/analytics/by-month', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getAnalyticsIncome(path: string = '/analytics/income', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getAnalyticsImpulseSummary(path: string = '/analytics/impulse-summary', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async getRolloverPreview(path: string = '/rollover/preview', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

  async postRolloverApply(path: string = '/rollover/apply', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers);
  }

  async getAnalyticsByCategory(path: string = '/analytics/by-category', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

}
