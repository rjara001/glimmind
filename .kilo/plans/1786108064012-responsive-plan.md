# Responsive improvements plan

## Current issues found
- **App header**: buttons overflow/wrap poorly on mobile (`App.tsx:346-409`)
- **GameControls**: `grid-cols-3` with `text-[8px]` is cramped on small screens
- **GameCard**: long terms can overflow; edit inputs lack mobile-friendly sizing
- **ListEditor**: tables have no mobile fallback (no scroll/card transform)
- **GameHeader**: hides useful info on mobile (`hidden md:flex`, `hidden sm:flex`)

## Proposed changes

### 1. App header mobile layout
- Wrap header buttons into a scrollable row or dropdown on `<sm`
- Keep: logo, Agregar, and avatar always visible
- Move: Sincronizar/Actividad/Informes into a ` overflow-x-auto` row with `whitespace-nowrap`

### 2. GameControls mobile
- Use `grid-cols-2` on `<sm` and stack secondary actions
- Increase button text to `text-[10px]` on mobile for readability
- Keep `grid-cols-3` on `sm+`

### 3. GameCard text safety
- Add `break-words` and `overflow-wrap-anywhere` to term/definition
- Ensure edit inputs use `max-w-full` instead of fixed `max-w-2xl` on small screens

### 4. ListEditor table mobile fallback
- Wrap table in `overflow-x-auto` with `min-w-[640px]` on the table
- This preserves existing desktop layout while allowing horizontal scroll on mobile

### 5. GameHeader info visibility
- Move mode badge and session count into a compact row visible on all sizes
- Keep goal progress hidden only on very small screens (`hidden lg:flex` instead of `hidden md:flex`)

## Out of scope
- Full redesign of dashboard cards
- Hamburger menu implementation
- Touch gesture optimizations
