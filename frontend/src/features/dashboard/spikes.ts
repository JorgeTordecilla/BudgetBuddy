import type { Transaction } from "@/api/types";

export const DEFAULT_SPIKE_MULTIPLIER = 3;
export const DEFAULT_MIN_SPIKE_CENTS = 50_000;
export const DEFAULT_MIN_SAMPLE_SIZE = 8;

export type SpikeDetectionConfig = {
  multiplier?: number;
  minSpikeCents?: number;
  minSampleSize?: number;
};

export type DashboardSpike = {
  id: string;
  amountCents: number;
  date: string;
  merchant: string | null;
};

export type SpikeDetectionResult = {
  medianCents: number | null;
  spikes: DashboardSpike[];
  insufficientData: boolean;
};

function toSortedAmounts(transactions: Transaction[]): number[] {
  return transactions
    .map((item) => item.amount_cents)
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);
}

export function computeMedianCents(transactions: Transaction[]): number | null {
  const amounts = toSortedAmounts(transactions);
  if (amounts.length === 0) {
    return null;
  }
  const middle = Math.floor(amounts.length / 2);
  if (amounts.length % 2 === 1) {
    return amounts[middle] ?? null;
  }
  const left = amounts[middle - 1];
  const right = amounts[middle];
  if (left === undefined || right === undefined) {
    return null;
  }
  return Math.round((left + right) / 2);
}

export function detectSpendingSpikes(transactions: Transaction[], config: SpikeDetectionConfig = {}): SpikeDetectionResult {
  const multiplier = config.multiplier ?? DEFAULT_SPIKE_MULTIPLIER;
  const minSpikeCents = config.minSpikeCents ?? DEFAULT_MIN_SPIKE_CENTS;
  const minSampleSize = config.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;

  const validTransactions = transactions.filter((item) => Number.isInteger(item.amount_cents) && item.amount_cents > 0);
  if (validTransactions.length < minSampleSize) {
    return {
      medianCents: computeMedianCents(validTransactions),
      spikes: [],
      insufficientData: true
    };
  }

  const medianCents = computeMedianCents(validTransactions);
  if (!medianCents || medianCents <= 0) {
    return {
      medianCents,
      spikes: [],
      insufficientData: false
    };
  }

  const threshold = Math.max(minSpikeCents, medianCents * multiplier);
  const spikes = validTransactions
    .filter((item) => item.amount_cents >= threshold)
    .sort((left, right) => right.amount_cents - left.amount_cents)
    .map((item) => ({
      id: item.id,
      amountCents: item.amount_cents,
      date: item.date,
      merchant: item.merchant ?? null
    }));

  return {
    medianCents,
    spikes,
    insufficientData: false
  };
}

