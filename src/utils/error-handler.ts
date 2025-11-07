export class ExcelGenerationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ExcelGenerationError';
  }
}

export function handleError(error: unknown): { message: string; code: string } {
  if (error instanceof ExcelGenerationError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
  };
}
