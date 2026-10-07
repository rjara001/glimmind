export class QuotaExceededError extends Error {
  constructor(public readonly maxCards: number) {
    super(`Quota exceeded. Maximum cards allowed: ${maxCards}`);
    this.name = 'QuotaExceededError';
  }
}

export class ListNotFoundError extends Error {
  constructor(public readonly listId: string) {
    super(`List not found: ${listId}`);
    this.name = 'ListNotFoundError';
  }
}