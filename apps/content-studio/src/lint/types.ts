export type LintLevel = "error" | "warn";

export type LintIssue = {
  level: LintLevel;
  code: string;
  message: string;
  nodeId?: string;
  chainId?: string;
  path?: string;
  suggestions?: string[];
};

export type LintResult = {
  errors: LintIssue[];
  warnings: LintIssue[];
};

export type LintApiResponse = {
  ok?: boolean;
  format?: "text" | "json";
  code?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  missingDist?: boolean;
};
