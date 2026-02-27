import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { mapTransactionProblem } from "@/api/problemMessages";
import { ApiProblemError } from "@/api/problem";
import { importTransactions } from "@/api/transactions";
import type { ProblemDetails, TransactionImportMode, TransactionImportRequest, TransactionImportResult } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import PageHeader from "@/components/PageHeader";
import ProblemBanner from "@/components/ProblemBanner";
import { parseImportInput } from "@/features/transactions/import/parseImportInput";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

function toProblemDetails(error: unknown, title: string): ProblemDetails {
  if (error instanceof ApiProblemError) {
    return mapTransactionProblem(error.problem, error.status, title);
  }
  return {
    type: "about:blank",
    title,
    status: 500,
    detail: "Unexpected client error."
  };
}

export default function TransactionsImportPage() {
  const { apiClient } = useAuth();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<TransactionImportMode>("partial");
  const [input, setInput] = useState("");
  const [payload, setPayload] = useState<TransactionImportRequest | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [requestProblem, setRequestProblem] = useState<ProblemDetails | null>(null);
  const [result, setResult] = useState<TransactionImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: (nextPayload: TransactionImportRequest) => importTransactions(apiClient, nextPayload),
    onSuccess: async (response) => {
      setRequestProblem(null);
      setResult(response);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error) => {
      setRequestProblem(toProblemDetails(error, "Import failed"));
    }
  });

  function runValidation() {
    const parsed = parseImportInput(input, mode);
    setValidationErrors(parsed.errors);
    setValidationWarning(parsed.warning);
    setPayload(parsed.payload);
    return parsed;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestProblem(null);

    const parsed = runValidation();
    if (!parsed.ok || !parsed.payload) {
      return;
    }

    try {
      await importMutation.mutateAsync(parsed.payload);
    } catch {
      // handled in onError
    }
  }

  return (
    <section>
      <PageHeader
        title="Import transactions"
        description="Paste JSON data and import transactions in bulk with clear row-level results."
        actions={(
          <Button asChild type="button" variant="outline" className="w-full sm:w-auto">
            <Link to="/app/transactions">Back to transactions</Link>
          </Button>
        )}
      />

      <ProblemBanner problem={requestProblem} onClose={() => setRequestProblem(null)} />

      <Card>
        <CardContent className="space-y-4 p-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Import mode</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  value="partial"
                  checked={mode === "partial"}
                  onChange={() => setMode("partial")}
                />
                Partial (recommended)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  value="all_or_nothing"
                  checked={mode === "all_or_nothing"}
                  onChange={() => setMode("all_or_nothing")}
                />
                All or nothing
              </label>
            </fieldset>

            <div className="space-y-2">
              <label htmlFor="import-json" className="text-sm font-medium">
                JSON input
              </label>
              <textarea
                id="import-json"
                aria-label="JSON input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder='Paste JSON array or object with "mode" and "items".'
                className="min-h-[220px] w-full rounded-md border bg-background p-3 font-mono text-sm"
              />
            </div>

            {validationWarning ? <p className="text-sm text-amber-700">{validationWarning}</p> : null}

            {validationErrors.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-destructive" aria-label="Validation errors">
                {validationErrors.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={runValidation}>
                Validate
              </Button>
              <Button
                type="submit"
                disabled={importMutation.isPending || !payload || validationErrors.length > 0}
              >
                {importMutation.isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card className="mt-4">
          <CardContent className="space-y-4 p-4">
            <h2 className="text-base font-semibold">Import result</h2>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <strong>Created:</strong> {result.created_count}
              </p>
              <p>
                <strong>Failed:</strong> {result.failed_count}
              </p>
            </div>

            {result.failures.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Index</th>
                      <th className="px-3 py-2">Message</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failures.map((failure) => (
                      <tr key={`${failure.index}-${failure.message}`} className="border-t">
                        <td className="px-3 py-2">{failure.index}</td>
                        <td className="px-3 py-2">{failure.message}</td>
                        <td className="px-3 py-2">{failure.problem?.type ?? "-"}</td>
                        <td className="px-3 py-2">{failure.problem?.title ?? "-"}</td>
                        <td className="px-3 py-2">{failure.problem?.status ?? "-"}</td>
                        <td className="px-3 py-2">{failure.problem?.detail ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No row failures.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
