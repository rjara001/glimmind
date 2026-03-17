AI Agent Contribution Rules

These rules MUST be followed by any automated agent modifying this repository.

If a rule conflicts with generated code, the rule MUST take precedence.

1. Language Policy
Required Language

All code MUST be written in English.

All comments MUST be written in English.

All commit messages MUST be written in English.

All documentation MUST be written in English.

Prohibited

Agents MUST NOT:

Write comments in Spanish.

Introduce Spanish text anywhere in the codebase.

Generate mixed-language comments.

2. General Development Rules

Agents MUST follow these principles when modifying code:

Follow the existing project structure.

Reuse existing utilities whenever possible.

Avoid duplicating logic.

Prefer simple and maintainable solutions.

Do not introduce unnecessary abstractions.

Do not refactor unrelated code unless explicitly required.

3. React State Management
Hooks Are the Default

React state MUST use hooks.

Agents MUST prefer hooks over class properties for reactive UI state.

Required APIs

Use the following React APIs:

useState() → component state

useReducer() → complex state logic

useMemo() → expensive computations

useCallback() → memoized callbacks

useEffect() → side effects

Prohibited Pattern

Agents MUST NOT implement reactive UI state using plain mutable properties.

const [countryGroups, setCountryGroups] = useState<CountryGroup[]>([]);
const [isLoading, setIsLoading] = useState(false);
4. React Refs
Modern Ref Usage

Agents MUST use useRef() for DOM references and mutable values that don't trigger re-renders.

Required Pattern
const scrollAnchor = useRef<HTMLDivElement>(null);

Use useRef for values that:

Need to persist across renders

Don't need to trigger re-renders when updated

Notes

Avoid directly manipulating the DOM from the child component. All game flow actions (focus, advancing cards) should be managed by the parent to prevent race conditions or unmounted component access.

5. React Effect Cleanup

When subscribing to observables or setting up side effects, agents MUST ensure cleanup.

Use the cleanup function returned by useEffect.

Required Pattern
useEffect(() => {
  const subscription = service.loadMore().subscribe(...);
  return () => subscription.unsubscribe();
}, [dependency]);

6. useEffect Dependencies

ALL dependencies in useEffect arrays MUST be explicitly declared. This prevents stale closures that cause race conditions and React DOM errors (e.g., "Failed to execute 'removeChild'").

Required Pattern
// Always include ALL used variables in dependencies
useEffect(() => {
  doSomething(userInput, value);
}, [userInput, value]);

// Event handlers with state MUST include the state variable
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      submit(userInput); // userInput MUST be in deps
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [userInput, submit]); // Missing userInput causes stale closure bugs

7. Type Safety

Agents MUST NOT use any.

All values MUST have explicit types.

Prohibited
const itemSubmissions: any[] = [];
Required
const itemSubmissions: SubmissionItem[] = [];

If a type does not exist, the agent MUST create an appropriate interface or type.

7. Types and Interfaces

Types and interfaces MUST NOT be declared inside components.

All types and interfaces MUST be placed in:

types
Prohibited
export interface CountryGroup { ... }

inside a component file.

Required
types/country-group.ts
8. Services Architecture

Services MUST NOT be colocated with components.

Folder Rules

Feature-specific services MUST live inside a feature services folder.

Services responsible for API communication MUST live in:

services

Agents MUST follow the existing project folder structure.
Agents MUST avoid placing multiple unrelated files in the same folder.

9. React JSX
Modern Control Flow

Agents MUST use JavaScript control flow in JSX.

Required
{countryGroups.map(group => (
  <CountryGroup key={group.id} {...group} />
))}

{isLoading && <Spinner />}

{switch (status) {
  case 'loading': return <Loader />;
  case 'error': return <Error />;
  default: return <Content />;
}}

Agents SHOULD prefer array methods (map, filter, reduce) over manual loops.

10. Code Quality

Agents SHOULD:

Write readable code.

Use explicit typing where appropriate.

Maintain consistency with the existing code style.

Prefer clarity over cleverness.

Keep components small and focused.

Extract custom hooks for reusable logic.

11. Scope Control

Agents MUST only modify files necessary to complete the task.

Agents MUST NOT:

Perform large-scale refactors

Rename files without necessity

Change project architecture

Modify build or configuration files unless required

12. File Naming Conventions
Component Files

Use PascalCase for component files: UserProfile.tsx

Use camelCase for utility/helper files: formatDate.ts

Use kebab-case for configuration files: vite.config.ts

Naming Patterns

Components: PascalCase (e.g., UserProfile, OrderList)

Hooks: camelCase starting with use (e.g., useAuth, useFetch)

Context: PascalCase ending with Context (e.g., AuthContext)

Types/Interfaces: PascalCase (e.g., User, OrderItem)

Constants: UPPER_SNAKE_CASE for true constants (e.g., MAX_RETRY_COUNT)

13. Component Structure
Required Order

Organize component code in this order:

Imports (external first, then internal)

Type definitions

Component function

Helper functions

Export default

Early Returns

Use early returns for conditional rendering before main JSX.

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return null;

return <Content data={data} />;
14. Props Patterns
Required Props Interface

Define props as an explicit interface outside the component.

interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
  variant?: 'default' | 'compact';
}
Default Props

Use default parameter values instead of defaultProps (deprecated).

function UserCard({ user, onSelect, variant = 'default' }: UserCardProps) {
  // ...
}
15. Event Handlers
Naming Convention

Name event handlers with on prefix for props and handle prefix for implementations.

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
16. Custom Hooks
Extraction Criteria

Extract a custom hook when:

Logic is reused across multiple components

A component exceeds 200 lines

Complex state logic can be abstracted

Side effects need consistent cleanup

Required Pattern
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
17. Error Handling
Try-Catch Pattern

Always wrap async operations in try-catch.

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
Error Boundaries

Use ErrorBoundary components to catch rendering errors.

18. Loading States
Required Pattern

Always implement loading states for async operations.

const [isLoading, setIsLoading] = useState(true);

// Show skeleton for initial load
if (isLoading && !data) {
  return <UserCardSkeleton />;
}
19. Performance Optimization
useMemo and useCallback

Use useMemo for expensive computations:

const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

Use useCallback when passing callbacks to optimized child components:

const handleClick = useCallback((id: string) => {
  setSelectedId(id);
}, []);
Lazy Loading

Use React.lazy() for code splitting:

const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
20. Accessibility (a11y)
Required Practices

Use semantic HTML elements (<button>, <nav>, <main>)

Include alt text for images

Use aria-label for icon-only buttons

Ensure keyboard navigation works

Use role attributes when semantic HTML isn't sufficient

Prohibited
<div onClick={handleClick}>Click me</div>
Required
<button onClick={handleClick}>Click me</button>
21. Security
Prohibited Patterns

Never hardcode secrets, API keys, or credentials

Never log sensitive information

Never include credentials in client-side code

Input Sanitization

Sanitize user inputs before rendering or sending to API.

22. API Integration
Service Layer Pattern

All API calls MUST go through service functions.

// services/api.ts
export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
Request/Response Types

Always type API request and response data.

23. Constants
Magic Numbers/Strings

Never use magic numbers or strings. Extract to named constants.

Prohibited
if (status === 'active' && retryCount < 3) { ... }
Required
const ACTIVE_STATUS = 'active';
const MAX_RETRY_COUNT = 3;

if (status === ACTIVE_STATUS && retryCount < MAX_RETRY_COUNT) { ... }
24. Testing
Unit Test Patterns

Test behavior, not implementation

Use meaningful test descriptions

Follow AAA pattern: Arrange, Act, Assert

Required Coverage

Custom hooks

Utility functions

Complex components

Error handling paths

25. Conditional Rendering
Boolean Props

Use explicit boolean values for optional props.

<Modal isOpen={true} onClose={handleClose} />
Ternary vs Logical AND

Use ternary for switching between two components

Use logical AND for optional rendering

// Ternary - two different outputs
{isEditing ? <EditForm /> : <ViewMode />}

// Logical AND - optional render
{isVisible && <Tooltip />}
26. Lists and Keys
Required Key Pattern

Always provide a unique key for list items. Use stable IDs, not array indices.

{data.map((item) => (
  <UserRow key={item.id} user={item} />
))}
Avoid Index as Key

Do not use array index as key unless the list is static and never reordered.

27. Context Usage
Pattern

Create context with explicit types and provider.

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
Consumer Pattern

Use custom hook for context consumption.

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
28. GameCard / Child Component Rules

Child components MUST only display data and not advance the game automatically.

No auto-advance or timeout inside children (GameCard, etc.). Parent (GameView) is responsible for advancing cards.

Child components may trigger callbacks (onNextCard) only in response to explicit user actions (button clicks, key presses handled at parent level).

Child components may focus input fields via ref, but focus must be delegated or safely checked to avoid unmounted components.

All state updates affecting game flow (card progression, cycle updates, score updates) MUST reside in parent components.

Timeouts for advancing cards belong in parent components, never children.

Children may show validation feedback, but any logic triggering progression MUST call a parent callback only, not directly manipulate parent state.