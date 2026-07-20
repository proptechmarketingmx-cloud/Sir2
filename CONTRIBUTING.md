# Contributing to SIR

Thanks for helping improve SIR.

## Workflow

1. Open an issue before larger changes so the scope stays clear.
2. Make small, descriptive commits.
3. Keep changes focused on one feature or fix at a time.
4. Update tests, docs, and UI text together when they are affected.

## Code style

- Prefer clear, small functions over large blocks.
- Avoid adding new global state unless there is no better option.
- Keep user-facing copy in Spanish consistent with the rest of the app.

## Review checklist

- Verify the app still loads with an empty graph.
- Confirm imports handle malformed JSON safely.
- Check that any DOM rendering of user content does not introduce XSS risk.

## Reporting bugs

Include:

- What you expected.
- What happened instead.
- Steps to reproduce.
- Browser and OS details when relevant.
