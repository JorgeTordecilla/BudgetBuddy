"""AUTO-GENERATED FILE. DO NOT EDIT.
source: backend/openapi.yaml
generator: budgetbuddy-py-sdkgen@1.0.0
spec_sha256: c24c2a234d0155910e7daec46257e669b2565532d71cc95d84c23ac7ab9e4df5
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Mapping
from urllib.request import Request, urlopen


@dataclass(slots=True)
class BudgetBuddyClient:
    base_url: str
    default_headers: dict[str, str] = field(default_factory=dict)

    def _request(self, method: str, path: str, body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        all_headers = dict(self.default_headers)
        if headers:
            all_headers.update(headers)
        data = None
        if body is not None:
            data = json.dumps(body).encode('utf-8')
            all_headers.setdefault('content-type', 'application/vnd.budgetbuddy.v1+json')
        req = Request(f"{self.base_url.rstrip('/')}" + path, data=data, method=method, headers=all_headers)
        with urlopen(req) as response:  # nosec B310 - expected SDK HTTP operation
            return response.status, response.read()

    def postAuthRegister(self, path: str = '/auth/register', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def postAuthLogin(self, path: str = '/auth/login', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def postAuthRefresh(self, path: str = '/auth/refresh', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def postAuthLogout(self, path: str = '/auth/logout', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def getAccounts(self, path: str = '/accounts', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def postAccounts(self, path: str = '/accounts', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def getAccountsAccountId(self, path: str = '/accounts/{account_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def patchAccountsAccountId(self, path: str = '/accounts/{account_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('PATCH', path, body=body, headers=headers)

    def deleteAccountsAccountId(self, path: str = '/accounts/{account_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('DELETE', path, body=body, headers=headers)

    def getCategories(self, path: str = '/categories', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def postCategories(self, path: str = '/categories', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def getCategoriesCategoryId(self, path: str = '/categories/{category_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def patchCategoriesCategoryId(self, path: str = '/categories/{category_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('PATCH', path, body=body, headers=headers)

    def deleteCategoriesCategoryId(self, path: str = '/categories/{category_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('DELETE', path, body=body, headers=headers)

    def getTransactions(self, path: str = '/transactions', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def postTransactions(self, path: str = '/transactions', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def postTransactionsImport(self, path: str = '/transactions/import', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def getTransactionsExport(self, path: str = '/transactions/export', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def getTransactionsTransactionId(self, path: str = '/transactions/{transaction_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def patchTransactionsTransactionId(self, path: str = '/transactions/{transaction_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('PATCH', path, body=body, headers=headers)

    def deleteTransactionsTransactionId(self, path: str = '/transactions/{transaction_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('DELETE', path, body=body, headers=headers)

    def getBudgets(self, path: str = '/budgets', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def postBudgets(self, path: str = '/budgets', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('POST', path, body=body, headers=headers)

    def getBudgetsBudgetId(self, path: str = '/budgets/{budget_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def patchBudgetsBudgetId(self, path: str = '/budgets/{budget_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('PATCH', path, body=body, headers=headers)

    def deleteBudgetsBudgetId(self, path: str = '/budgets/{budget_id}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('DELETE', path, body=body, headers=headers)

    def getAudit(self, path: str = '/audit', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def getAnalyticsByMonth(self, path: str = '/analytics/by-month', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)

    def getAnalyticsByCategory(self, path: str = '/analytics/by-category', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:
        return self._request('GET', path, body=body, headers=headers)
