from enum import Enum


class _DomainEnum(str, Enum):
    def __str__(self) -> str:
        return str(self.value)


class TransactionType(_DomainEnum):
    INCOME = "income"
    EXPENSE = "expense"


class CategoryType(_DomainEnum):
    INCOME = "income"
    EXPENSE = "expense"


class AccountType(_DomainEnum):
    CASH = "cash"
    DEBIT = "debit"
    CREDIT = "credit"
    BANK = "bank"


class SavingsGoalStatus(_DomainEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TransactionMood(_DomainEnum):
    HAPPY = "happy"
    NEUTRAL = "neutral"
    SAD = "sad"
    ANXIOUS = "anxious"
    BORED = "bored"


class IncomeFrequency(_DomainEnum):
    MONTHLY = "monthly"
