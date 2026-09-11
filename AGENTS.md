# AGENTS.md — AI Agent Contribution Rules

These rules MUST be followed by any automated agent modifying this repository.
If a rule conflicts with generated code, the rule MUST take precedence.

---

## 1. Language Policy

### Required Language
- All code MUST be written in English.
- All comments MUST be written in English.
- All commit messages MUST be written in English.
- All documentation MUST be written in English.

### Prohibited
Agents MUST NOT:
- Write comments in Spanish.
- Introduce Spanish text anywhere in the codebase.
- Generate mixed-language comments.

---

## 2. General Development Rules

Agents MUST follow these principles when modifying code:
- Follow the existing project structure.
- Reuse existing utilities whenever possible.
- Avoid duplicating logic.
- Prefer simple and maintainable solutions.
- Do not introduce unnecessary abstractions.
- Do not refactor unrelated code unless explicitly required.

---

## 3. React State Management

### Hooks Are the Default
React state MUST use hooks.
Agents MUST prefer hooks over class properties for reactive UI state.

### Required APIs
- `useState()` -> component state
- `useReducer()` -> complex state logic
- `useMemo()` -> expensive computations
- `useCallback()` -> memoized callbacks
- `useEffect()` -> side effects

### Prohibited Pattern
Agents MUST NOT implement reactive UI state using plain mutable properties.

```tsx
const [countryGroups, setCountryGroups] = useState<CountryGroup[]>([]);
const [isLoading, setIsLoading] = useState(false);
```

---

## 4. React Refs

### Modern Ref Usage
Agents MUST use `useRef()` for DOM references and mutable values that don't trigger re-renders.

### Required Pattern
```tsx
const scrollAnchor = useRef<HTMLDivElement>(null);
```

Use `useRef` for values that:
- Need to persist across renders
- Don't need to trigger re-renders when updated

### Notes
Avoid directly manipulating the DOM from the child component. All game flow actions (focus, advancing cards) should be managed by the parent to prevent race conditions or unmounted component access.

---

## 5. React Effect Cleanup

When subscribing to observables or setting up side effects, agents MUST ensure cleanup.
Use the cleanup function returned by `useEffect`.

### Required Pattern
```tsx
useEffect(() => {
  const subscription = service.loadMore().subscribe(...);
  return () => subscription.unsubscribe();
}, [dependency]);
```

---

## 6. useEffect Dependencies

ALL dependencies in `useEffect` arrays MUST be explicitly declared. This prevents stale closures that cause race conditions and React DOM errors.

### Required Pattern
```tsx
useEffect(() => {
  doSomething(userInput, value);
}, [userInput, value]);

useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      submit(userInput);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [userInput, submit]);
```

---

## 7. Type Safety

Agents MUST NOT use `any`.
All values MUST have explicit types.

### Prohibited
```ts
const itemSubmissions: any[] = [];
```

### Required
```ts
const itemSubmissions: SubmissionItem[] = [];
```

If a type does not exist, the agent MUST create an appropriate interface or type.

---

## 8. Types and Interfaces

Types and interfaces MUST NOT be declared inside components.
All types and interfaces MUST be placed in:

```
types/
```

### Prohibited
```ts
export interface CountryGroup { ... }
```
inside a component file.

### Required
```
types/country-group.ts
```

---

## 9. Services Architecture

Services MUST NOT be colocated with components.

### Folder Rules
- Feature-specific services MUST live inside a feature services folder.
- Services responsible for API communication MUST live in:

```
services/
```

- Agents MUST follow the existing project folder structure.
- Agents MUST avoid placing multiple unrelated files in the same folder.

---

## 10. React JSX

### Modern Control Flow
Agents MUST use JavaScript control flow in JSX.

### Required
```tsx
{countryGroups.map(group => (
  <CountryGroup key={group.id} {...group} />
))}

{isLoading && <Spinner />}
```

Agents SHOULD prefer array methods (`map`, `filter`, `reduce`) over manual loops.

---

## 11. Code Quality

Agents SHOULD:
- Write readable code.
- Use explicit typing where appropriate.
- Maintain consistency with the existing code style.
- Prefer clarity over cleverness.
- Keep components small and focused.
- Extract custom hooks for reusable logic.

---

## 12. Scope Control

Agents MUST only modify files necessary to complete the task.

Agents MUST NOT:
- Perform large-scale refactors
- Rename files without necessity
- Change project architecture
- Modify build or configuration files unless required

---

## 13. File Naming Conventions

### Component Files
- Use PascalCase for component files: `UserProfile.tsx`
- Use camelCase for utility/helper files: `formatDate.ts`
- Use kebab-case for configuration files: `vite.config.ts`

### Naming Patterns
- Components: PascalCase (e.g., `UserProfile`, `OrderList`)
- Hooks: camelCase starting with `use` (e.g., `useAuth`, `useFetch`)
- Context: PascalCase ending with `Context` (e.g., `AuthContext`)
- Types/Interfaces: PascalCase (e.g., `User`, `OrderItem`)
- Constants: UPPER_SNAKE_CASE for true constants (e.g., `MAX_RETRY_COUNT`)

---

## 14. Component Structure

### Required Order
Organize component code in this order:
1. Imports (external first, then internal)
2. Type definitions
3. Component function
4. Helper functions
5. Export default

### Early Returns
Use early returns for conditional rendering before main JSX.

```tsx
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return null;

return <Content data={data} />;
```

---

## 15. Props Patterns

### Required Props Interface
Define props as an explicit interface outside the component.

```ts
interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
  variant?: 'default' | 'compact';
}
```

### Default Props
Use default parameter values instead of `defaultProps` (deprecated).

```tsx
function UserCard({ user, onSelect, variant = 'default' }: UserCardProps) {
  // ...
}
```

---

## 16. Event Handlers

### Naming Convention
Name event handlers with `on` prefix for props and `handle` prefix for implementations.

```tsx
interface Props {
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

function Form({ onSubmit, onCancel }: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  // ...
}
```

---

## 17. Custom Hooks

### Extraction Criteria
Extract a custom hook when:
- Logic is reused across multiple components
- A component exceeds 200 lines
- Complex state logic can be abstracted
- Side effects need consistent cleanup

### Required Pattern
```tsx
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [userId]);

  return { user, isLoading, error };
}
```

---

## 18. Error Handling

### Try-Catch Pattern
Always wrap async operations in try-catch.

```ts
async function loadData() {
  try {
    setIsLoading(true);
    const data = await api.fetchData();
    setData(data);
  } catch (error) {
    setError(error instanceof Error ? error : new Error('Unknown error'));
  } finally {
    setIsLoading(false);
  }
}
```

### Error Boundaries
Use `ErrorBoundary` components to catch rendering errors.

---

## 19. Loading States

### Required Pattern
Always implement loading states for async operations.

```tsx
const [isLoading, setIsLoading] = useState(true);

if (isLoading && !data) {
  return <UserCardSkeleton />;
}
```

---

## 20. Performance Optimization

### useMemo and useCallback
Use `useMemo` for expensive computations:

```tsx
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

Use `useCallback` when passing callbacks to optimized child components:

```tsx
const handleClick = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

### Lazy Loading
Use `React.lazy()` for code splitting:

```tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

---

## 21. Accessibility (a11y)

### Required Practices
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- Include `alt` text for images
- Use `aria-label` for icon-only buttons
- Ensure keyboard navigation works
- Use `role` attributes when semantic HTML isn't sufficient

### Prohibited
```tsx
<div onClick={handleClick}>Click me</div>
```

### Required
```tsx
<button onClick={handleClick}>Click me</button>
```

---

## 22. Security

### Prohibited Patterns
- Never hardcode secrets, API keys, or credentials
- Never log sensitive information
- Never include credentials in client-side code

### Input Sanitization
Sanitize user inputs before rendering or sending to API.

---

## 23. API Integration

### Service Layer Pattern
All API calls MUST go through service functions.

```ts
// services/api.ts
export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
```

### Request/Response Types
Always type API request and response data.

---

## 24. Constants

### Magic Numbers/Strings
Never use magic numbers or strings. Extract to named constants.

### Prohibited
```ts
if (status === 'active' && retryCount < 3) { ... }
```

### Required
```ts
const ACTIVE_STATUS = 'active';
const MAX_RETRY_COUNT = 3;

if (status === ACTIVE_STATUS && retryCount < MAX_RETRY_COUNT) { ... }
```

---

## 25. Testing

### Unit Test Patterns
- Test behavior, not implementation
- Use meaningful test descriptions
- Follow AAA pattern: Arrange, Act, Assert

### Required Coverage
- Custom hooks
- Utility functions
- Complex components
- Error handling paths

---

## 26. Conditional Rendering

### Boolean Props
Use explicit boolean values for optional props.

```tsx
<Modal isOpen={true} onClose={handleClose} />
```

### Ternary vs Logical AND
Use ternary for switching between two components.
Use logical AND for optional rendering.

```tsx
// Ternary - two different outputs
{isEditing ? <EditForm /> : <ViewMode />}

// Logical AND - optional render
{isVisible && <Tooltip />}
```

---

## 27. Lists and Keys

### Required Key Pattern
Always provide a unique `key` for list items. Use stable IDs, not array indices.

```tsx
{data.map((item) => (
  <UserRow key={item.id} user={item} />
))}
```

### Avoid Index as Key
Do not use array index as `key` unless the list is static and never reordered.

---

## 28. Context Usage

### Pattern
Create context with explicit types and provider.

```tsx
interface AuthContextValue {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Consumer Pattern
Use custom hook for context consumption.

```tsx
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 29. GameCard / Child Component Rules

- Child components MUST only display data and not advance the game automatically.
- No auto-advance or timeout inside children (GameCard, etc.). Parent (GameView) is responsible for advancing cards.
- Child components may trigger callbacks (`onNextCard`) only in response to explicit user actions (button clicks, key presses handled at parent level).
- Child components may focus input fields via ref, but focus must be delegated or safely checked to avoid unmounted components.
- All state updates affecting game flow (card progression, cycle updates, score updates) MUST reside in parent components.
- Timeouts for advancing cards belong in parent components, never children.
- Children may show validation feedback, but any logic triggering progression MUST call a parent callback only, not directly manipulate parent state.

---

## 30. Version Bumping

### Required
Every time changes are committed to main, the version MUST be bumped in BOTH files:
- `src/constants/version.ts` -> `APP_VERSION = 'x.y.z'`
- `package.json` -> `"version": "x.y.z"`

### Rules
- Patch (z) for bug fixes and small changes.
- Minor (y) for new features.
- Major (x) for breaking changes.
- NEVER deploy without bumping the version first.
- NEVER use the same version number for two different deploys.

---

## 31. Firebase Emulator Persistence

Always start the Firebase emulators with the persistent script:

```bash
npm run emulators
```

This runs:

```bash
firebase emulators:start --only auth,functions,firestore --import .emulator-data --export-on-exit .emulator-data
```

### Rules
- NEVER run `firebase emulators:start` without `--import`/`--export-on-exit`. Without persistence, a restart wipes all auth users AND all Firestore data.
- If the emulator data is wiped (or after the first empty boot): every authenticated app request returns 401 Unauthorized because the stored ID token points to a uid that no longer exists. The user MUST sign out and sign in again.
- The `.emulator-data` directory MUST stay in `.gitignore`.

---

## 32. Git Inspection & Refactoring Rules

### Inspection First
Before modifying existing code or diagnosing bugs, agents MUST inspect past commit history (using `git log -S "<feature>"`, `git diff`, or `@modelcontextprotocol/server-git` tools) to understand the original intent and avoid regressions.

### No Silent Removals
Agents MUST NOT remove, disable, or bypass existing features, feedback mechanisms (such as Levenshtein distance calculations or similarity percentage toasts), or validation logic unless explicitly mandated in an approved plan under `docs/plans/`.

### No Parallel Engines or Flags
Agents MUST NOT introduce dual engines, temporary transition modes, or boolean toggles (e.g., `isEngineActive`) that create parallel validation paths. All refactors MUST unify logic in-place within the primary authoritative engine.

### Pre-Commit Verification
Agents MUST inspect their own `git diff` before declaring any task completed to ensure no stray code, broken imports, or unintended side effects were introduced.

---

## 33. Verification Before Declaring Success

### Mandatory Verification
Before declaring "done", "complete", "listo", or "the plan was applied", agents MUST:
1. Run `npx tsc --noEmit` and paste the full output.
2. Run the relevant tests (`npx vitest run <path>`) and paste the full output.
3. If there are errors, DO NOT declare success. Fix them first.
4. If you cannot fix them, explicitly state: "NOT READY. Errors: [list]".

### Prohibited Claims
Agents MUST NOT:
- Claim "the build passes" as proof of correctness. Vite does not type-check. A successful build with 40 TypeScript errors is a broken build.
- Claim "the tests pass" without pasting the output.
- Claim "the plan was applied 100%" without evidence.
- Claim "the file exists" without verifying with `ls` or `cat`.

### Required Evidence Format
When declaring success, agents MUST provide:

```
=== TSC OUTPUT ===
[full output of npx tsc --noEmit]

=== TEST OUTPUT ===
[full output of npx vitest run]

=== FILES VERIFIED ===
[output of ls for each new/modified file]
```

If any section is empty, the task is NOT complete.

---

## 34. Read Before Modify

### Mandatory Reading
Before modifying any file, agents MUST:
1. Read the full file with `cat` or `Read` tool.
2. Identify the current signature of every function they plan to change.
3. Search for all call sites with `grep -r "functionName" src/`.
4. Read the types used in the file.

### Prohibited Assumptions
Agents MUST NOT assume:
- That a function has a certain signature without reading it.
- That a type has a certain field without reading it in `src/types/`.
- That a hook returns a certain shape without reading it.
- That a component accepts a certain prop without reading its interface.

If the agent cannot verify something, it MUST say: "I cannot verify X without reading Y. Please provide Y or let me read it."

### Example of Failure

```
// Agent assumed useDeckValidation returns { result, isValidating }
// but the actual signature was: DeckValidationResult | null
// Result: 20+ TypeScript errors
```

---

## 35. Update All Call Sites

### When Changing a Signature
If an agent changes the signature of a function, hook, or component, it MUST:
1. Search for ALL call sites: `grep -r "functionName" src/ tests/`
2. Update EVERY call site.
3. Run `tsc --noEmit` to verify no errors remain.

### Prohibited
Agents MUST NOT:
- Change a function signature without updating call sites.
- Leave broken call sites for "later".
- Assume that call sites will "just work".

### Example of Failure

```
// Agent changed useDeckValidation to return { result, isValidating }
// but did NOT update DeckStoreOnboarding.tsx line 35:
const { result: validationResult, isValidating } = useDeckValidation(...);
// Result: TS2339 Property 'result' does not exist on type 'DeckValidationResult | null'
```

---

## 36. Update Tests When Code Changes

### Mandatory Test Updates
When code changes, agents MUST update the corresponding tests:
1. If a component now has 1 button instead of 3, update the test to check for 1 button.
2. If a hook now returns a different shape, update the test mocks.
3. If a type now has a new field, update the test fixtures.
4. If a constant value changes, update the test expectations.

### Prohibited
Agents MUST NOT:
- Modify tests to make them pass without fixing the underlying code.
- Leave tests that reference removed features.
- Skip running tests after code changes.

### Example of Failure

```
// Agent changed DeckValidationScreen to have 1 button
// but test still does:
fireEvent.click(screen.getByText(/Anadir solo tarjetas nuevas/));
// Result: 6 failing tests because the button no longer exists
```

---

## 37. No Hallucination

### Prohibited Behaviors
Agents MUST NOT:
- Invent that a file exists without verifying with `ls` or `cat`.
- Invent that a test passes without running it.
- Invent that an error is fixed without running `tsc --noEmit`.
- Invent content of files they haven't read.
- Write unrelated content (theology, history, etc.) when asked to audit code.
- Claim "the plan was applied" without evidence.

### Required Behavior
If an agent does not know something, it MUST say:
"I don't know. Please provide X or let me read Y."

If an agent cannot verify something, it MUST say:
"I cannot verify X. Here's what I need: [list]."

### Example of Failure

```
// User asked: "Audit the plan execution"
// Agent responded with a paragraph about Genesis and Eve
// Result: complete loss of trust, no audit performed
```

---

## 38. Closing Checklist

Before saying "done", agents MUST complete this checklist:

- [ ] Did I run `npx tsc --noEmit` and paste the output?
- [ ] Is the `tsc` output empty (no errors)?
- [ ] Did I run the relevant tests and paste the output?
- [ ] Do all tests pass?
- [ ] Did I verify the new files exist with `ls`?
- [ ] Did I read the files I modified before modifying them?
- [ ] Did I update all call sites if I changed a signature?
- [ ] Did I leave any `any` or `@ts-ignore`?
- [ ] Did I leave any unused variables or imports?
- [ ] Did I update the tests to match the new code?

If any answer is "no", it is NOT done.

---

## 39. Concise Communication

### Required Style
Agents MUST communicate concisely:
- No theology, philosophy, or unrelated topics.
- No paragraphs longer than 5 lines.
- No rambling explanations.
- Paste command outputs, not descriptions.
- If you don't know, say "I don't know".

### Prohibited
Agents MUST NOT:
- Write paragraphs about Genesis when asked to audit code.
- Explain concepts the user already knows.
- Repeat the user's question back to them.
- Use filler phrases like "Great question!" or "Certainly!".

### Example of Good Communication

```
"Ran `tsc --noEmit`. 40 errors found:
- DeckStoreOnboarding.tsx: 20 errors
- useAssociationManipulation.ts: 15 errors
- Others: 5 errors

Not ready. Need to fix DeckStoreOnboarding first."
```

### Example of Bad Communication

```
"That's a great question! Let me think about this. In Genesis, we see that Eve was named..."
```

---

## 40. Verify Before Assuming

### Mandatory Verification
Before assuming anything, agents MUST verify:
1. Before assuming a file exists -> `ls` or `cat`.
2. Before assuming a function signature -> read the file.
3. Before assuming a type has a field -> read the type.
4. Before assuming a test passes -> run it.
5. Before assuming a constant value -> read the constant file.
6. Before assuming a hook returns something -> read the hook.

### Prohibited Assumptions
Agents MUST NOT assume:
- That a file exists because the plan says so.
- That a function has the signature the plan describes.
- That a type has the fields the plan mentions.
- That tests pass because they existed before.
- That a build passing means the code works.

If the agent cannot verify something, it MUST ask the user or read the relevant file.

---

## 41. One Change at a Time

### Incremental Changes
Agents MUST make changes incrementally:
1. Modify ONE file.
2. Run `npx tsc --noEmit`.
3. If errors, fix them before continuing.
4. Modify the NEXT file.
5. Run `npx tsc --noEmit` again.
6. Repeat until done.

### Prohibited
Agents MUST NOT:
- Modify 10 files at once and then run `tsc`.
- Make a large refactor without intermediate verification.
- Leave the code in a broken state "for later".

### Rationale
If you modify 10 files at once and `tsc` reports 40 errors, you don't know which file caused which error. Modifying one file at a time makes debugging trivial.

---

## 42. No Success Claims Without Evidence

### Prohibited Phrases
Agents MUST NOT use these phrases without evidence:
- "The plan was applied 100%"
- "The build succeeds"
- "Everything works"
- "The code is ready"
- "Tests pass"
- "No errors remain"

### Required Evidence
Before using any of these phrases, agents MUST provide:
1. The command they ran.
2. The full output of the command.
3. A summary of what the output means.

If the output contains errors, the agent MUST NOT claim success.

### Example of Failure

```
// Agent claimed: "The build succeeds. The runtime error is fixed."
// Reality: 40 TypeScript errors, 18 failing tests
// This is a lie, not a claim
```

---

## Quick Reference - Before Saying "Done"

```
1. npx tsc --noEmit          -> must be empty
2. npx vitest run <path>     -> must pass
3. ls <new-file>             -> must exist
4. grep -r "<fn>" src/       -> all call sites updated
5. git diff                  -> no stray code
```

If any of these fail, the task is NOT done.