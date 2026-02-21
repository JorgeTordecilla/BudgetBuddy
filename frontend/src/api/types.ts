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
