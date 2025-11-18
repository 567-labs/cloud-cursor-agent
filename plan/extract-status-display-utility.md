# Extract Duplicate getStatusDisplay Function

## Problem
The `getStatusDisplay` function is duplicated in two files:
- `src/components/AgentList.tsx` (lines 27-42)
- `src/components/AgentStatus.tsx` (lines 18-33)

This violates DRY (Don't Repeat Yourself) principle and makes maintenance harder.

## Tasks
1. Create a new utility file `src/utils/status.ts`
2. Move the `getStatusDisplay` function to the utility file
3. Export the function from the utility file
4. Update `AgentList.tsx` to import and use the shared function
5. Update `AgentStatus.tsx` to import and use the shared function
6. Ensure both components work correctly with the shared utility

## Files to Modify
- Create: `src/utils/status.ts`
- Update: `src/components/AgentList.tsx`
- Update: `src/components/AgentStatus.tsx`

## Expected Outcome
- Single source of truth for status display logic
- Reduced code duplication
- Easier to maintain and update status display in the future

