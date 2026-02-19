/* AUTO-GENERATED FILE. DO NOT EDIT.
 * source: backend/openapi.yaml
 * generator: budgetbuddy-ts-sdkgen@1.0.0
 * spec_sha256: 4be659271890ccfdc5a360faa1e436c74cfdfcb13c6fc0eca753c1b56c2de98f
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export interface SDKConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

export class BudgetBuddyClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(cfg: SDKConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.defaultHeaders = cfg.defaultHeaders ?? {};
  }

  private async request(method: HttpMethod, path: string, body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    const finalHeaders: Record<string, string> = { ...this.defaultHeaders, ...(headers ?? {}) };
    if (body !== undefined && !finalHeaders['content-type']) {
      finalHeaders['content-type'] = 'application/vnd.budgetbuddy.v1+json';
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return res;
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

  async getAnalyticsByCategory(path: string = '/analytics/by-category', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, body, headers);
  }

}
