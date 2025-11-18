/**
 * Shared validation result helpers.
 */

export interface ValidationSuccess {
  valid: true;
}

export interface ValidationFailure {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;
