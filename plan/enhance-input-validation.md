# Enhance Input Validation

## Problem
The validation utilities in `src/utils/validation.ts` could be enhanced:
1. More comprehensive validation rules
2. Better error messages
3. Additional validation functions for edge cases

## Tasks
1. Enhance `validateRepositoryUrl` to handle more edge cases (e.g., trailing slashes, case sensitivity)
2. Improve `validateRef` with more comprehensive rules
3. Add validation for branch names (if used)
4. Enhance `validateAgentId` with better format checking
5. Add validation for plan file paths/content
6. Ensure all validation functions return clear, actionable error messages

## Files to Modify
- `src/utils/validation.ts`
- Consider updating call sites if validation signatures change

## Expected Outcome
- More robust input validation
- Better error messages for invalid inputs
- Prevention of common user errors
- More consistent validation patterns

