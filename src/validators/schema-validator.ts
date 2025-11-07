import { ExcelSchema, ExcelConfig } from '../types/schema.js';
import { ZodError } from 'zod';

export class SchemaValidator {
  static validate(data: unknown): { success: true; data: ExcelConfig } | { success: false; errors: string[] } {
    try {
      const validated = ExcelSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        );
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validatePartial(data: unknown): { success: boolean; errors?: string[] } {
    try {
      ExcelSchema.partial().parse(data);
      return { success: true };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          errors: error.errors.map(e => e.message)
        };
      }
      return { success: false, errors: ['Validation failed'] };
    }
  }
}
