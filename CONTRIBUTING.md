# Contributing to Smart Tiffin Platform

Thank you for considering contributing to the Smart Tiffin Platform! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please read and adhere to our Code of Conduct:

- **Be Respectful**: Treat all community members with respect and courtesy
- **Be Inclusive**: Welcome people of all backgrounds and experiences
- **Be Professional**: Keep discussions professional and constructive
- **Report Issues**: Report unacceptable behavior to the maintainers

### Enforcement

Violations of the Code of Conduct may result in:
- Temporary or permanent ban from the repository
- Removal of contributed code
- Reporting to GitHub Trust & Safety team

---

## Getting Started

### Prerequisites

1. **Node.js 20+** - Download from [nodejs.org](https://nodejs.org)
2. **pnpm 10+** - Install globally:
   ```bash
   npm install -g pnpm
   ```
3. **PostgreSQL 14+** or Neon account for database
4. **Git** - For version control

### Setup Development Environment

1. **Fork the Repository**
   ```bash
   # Visit https://github.com/yourusername/smart-tiffin-platform
   # Click "Fork" button
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/yourusername/smart-tiffin-platform.git
   cd Meal-and-expance-tracker
   ```

3. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/original/smart-tiffin-platform.git
   ```

4. **Install Dependencies**
   ```bash
   pnpm install
   ```

5. **Create Environment File**
   ```bash
   cp artifacts/backend/.env.example artifacts/backend/.env
   # Edit .env with your database URL
   ```

6. **Initialize Database**
   ```bash
   pnpm --filter @workspace/db run push
   ```

7. **Seed Demo Data** (optional)
   ```bash
   pnpm --filter @workspace/scripts run seed
   ```

---

## Development Workflow

### Starting Development

1. **Sync with Upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Make Changes**
   - Write code following [Coding Standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation

4. **Run Tests**
   ```bash
   pnpm run typecheck      # Type checking
   pnpm run build          # Build all packages
   pnpm run lint           # Lint code (if available)
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/my-feature
   ```

7. **Create Pull Request**
   - Go to GitHub and create PR from your fork to main repo
   - Fill in the PR template with details
   - Wait for review

### During Development

**Start Services for Testing:**

Terminal 1 - Backend:
```bash
cd artifacts/backend
pnpm dev
```

Terminal 2 - Frontend:
```bash
cd artifacts/frontend
pnpm dev
```

Terminal 3 - Database monitoring:
```bash
cd lib/db
npm run studio  # if available
```

---

## Branch Naming Conventions

### Format
```
<type>/<description>
```

### Types

| Type | Purpose | Example |
|------|---------|---------|
| `feature/` | New feature | `feature/add-email-notifications` |
| `bugfix/` | Bug fix | `bugfix/fix-budget-calculation` |
| `hotfix/` | Urgent production fix | `hotfix/fix-login-crash` |
| `refactor/` | Code refactoring | `refactor/optimize-analytics` |
| `docs/` | Documentation updates | `docs/update-setup-guide` |
| `test/` | Test improvements | `test/add-payment-tests` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |

### Description Guidelines

- Use lowercase letters and numbers
- Use hyphens to separate words (not underscores)
- Keep it concise but descriptive
- Max 50 characters after type prefix

**Good Examples:**
- `feature/add-expense-filtering`
- `bugfix/resolve-attendance-sync-issue`
- `docs/add-deployment-guide`

**Bad Examples:**
- `feature/new_stuff` (vague)
- `FEATURE/AddExpenseFiltering` (wrong case)
- `feature/update-the-entire-expense-module-with-new-functionality-and-optimization` (too long)

---

## Commit Message Format

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Scope
Specific area being modified (optional):
- `backend`
- `frontend`
- `db`
- `auth`
- `analytics`
- `payments`
- etc.

### Subject
- Use imperative mood ("add feature" not "added feature")
- Don't capitalize first letter
- No period at the end
- Max 50 characters

### Body (optional)
- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line
- Use bullet points for multiple changes

### Footer (optional)
Reference issues and breaking changes:
```
Closes #123
Breaking Change: Old API is deprecated
```

### Examples

**Simple fix:**
```
fix(auth): prevent JWT token refresh loop
```

**Feature with details:**
```
feat(analytics): add customer churn calculation

- Calculate churn rate based on inactive customers
- Include 30-day activity window
- Add metrics to owner dashboard
- Update analytics data refresh schedule

Closes #456
```

**Breaking change:**
```
refactor(api): restructure expense endpoints

BREAKING CHANGE: /expenses/summary endpoint replaced with 
/expenses/analytics returning different response format
```

---

## Pull Request Process

### Before Creating PR

1. **Rebase with Main**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push to Your Fork**
   ```bash
   git push -f origin feature/my-feature
   ```

3. **Run Final Tests**
   ```bash
   pnpm run typecheck
   pnpm run build
   ```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Refactor
- [ ] Documentation
- [ ] Other

## Related Issues
Closes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing Performed
- [ ] Unit tests added/updated
- [ ] Integration tested locally
- [ ] Tested on both frontend and backend (if applicable)

## Screenshots/Demo (if applicable)
<!-- Attach screenshots or GIFs -->

## Checklist
- [ ] Code follows style guidelines
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Tests added/updated
- [ ] Builds successfully
- [ ] TypeScript errors resolved
```

### PR Review Process

1. **At least 2 approvals required** for merge
2. **All CI checks must pass**
3. **No merge conflicts**
4. **No unresolved conversations**

### Addressing Feedback

1. **Make requested changes**
2. **Commit with message**: `fix: address review feedback`
3. **Push changes**: `git push origin feature/my-feature`
4. **Comment**: "Review feedback addressed, please re-review"
5. **Don't force-push** after review starts (unless requested)

---

## Coding Standards

### TypeScript

1. **Type Everything**
   ```typescript
   // Good
   const calculateTotal = (items: Item[]): number => {
     return items.reduce((sum, item) => sum + item.price, 0);
   };

   // Bad
   const calculateTotal = (items) => {
     return items.reduce((sum, item) => sum + item.price, 0);
   };
   ```

2. **Use Interfaces for Complex Types**
   ```typescript
   interface User {
     id: string;
     name: string;
     email: string;
     role: 'STUDENT' | 'OWNER' | 'ADMIN';
   }
   ```

3. **Avoid `any` Type**
   ```typescript
   // Good - use specific type or generic
   const getValue = <T>(obj: Record<string, T>, key: string): T | undefined => {
     return obj[key];
   };

   // Bad - avoid this
   const getValue = (obj: any, key: any): any => {
     return obj[key];
   };
   ```

### File Organization

1. **Imports**: Organize imports (React, packages, local)
   ```typescript
   // React/vendor imports first
   import React from 'react';
   import { useState } from 'react';
   import axios from 'axios';

   // Local imports
   import { useAuth } from '@/hooks/useAuth';
   import { formatCurrency } from '@/lib/utils';
   ```

2. **Component Structure**
   ```typescript
   // Props interface
   interface Props {
     title: string;
     onClose: () => void;
   }

   // Component
   export const Modal: React.FC<Props> = ({ title, onClose }) => {
     const [state, setState] = useState('');

     const handleAction = () => {
       // logic
     };

     return (
       // JSX
     );
   };
   ```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `UserService` |
| Interfaces | PascalCase | `IUser` or `User` |
| Functions | camelCase | `calculateTotal` |
| Variables | camelCase | `userName` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Files | kebab-case | `user-service.ts` |
| React Components | PascalCase | `UserCard.tsx` |
| Hooks | camelCase with `use` | `useAuth.ts` |

### Code Quality

1. **Keep Functions Small**
   - Single responsibility
   - Easy to test
   - Easy to understand

2. **Avoid Deeply Nested Code**
   ```typescript
   // Bad - deeply nested
   if (user) {
     if (user.isActive) {
       if (user.role === 'ADMIN') {
         // do something
       }
     }
   }

   // Good - early return
   if (!user || !user.isActive) return;
   if (user.role !== 'ADMIN') return;
   // do something
   ```

3. **Use Meaningful Variable Names**
   ```typescript
   // Good
   const isValidEmail = email.includes('@');
   const expensesByCategory = expenses.groupBy('category');

   // Bad
   const valid = email.includes('@');
   const data = expenses.groupBy('category');
   ```

### Documentation

1. **Add JSDoc Comments**
   ```typescript
   /**
    * Calculate monthly expense total
    * @param expenses - Array of expense objects
    * @param month - Month number (1-12)
    * @returns Total expenses for the month
    */
   const calculateMonthlyTotal = (expenses: Expense[], month: number): number => {
     // implementation
   };
   ```

2. **Comment Complex Logic**
   ```typescript
   // Calculate collection rate excluding overdue bills
   const collectionRate = (
     collectedAmount / (totalBilledAmount - overdueBills)
   ) * 100;
   ```

---

## Testing Guidelines

### Unit Tests

```typescript
describe('calculateMonthlyTotal', () => {
  it('should return sum of expenses for given month', () => {
    const expenses = [
      { id: '1', amount: 100, month: 6 },
      { id: '2', amount: 200, month: 6 },
    ];

    const result = calculateMonthlyTotal(expenses, 6);
    expect(result).toBe(300);
  });

  it('should return 0 for month with no expenses', () => {
    const expenses = [];
    const result = calculateMonthlyTotal(expenses, 6);
    expect(result).toBe(0);
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test happy paths and edge cases
- Test error scenarios

### Running Tests

```bash
pnpm run test              # Run all tests
pnpm run test:watch       # Watch mode
pnpm run test:coverage    # Coverage report
```

---

## Documentation Standards

### README Updates

When adding new features:
1. Update feature list in README
2. Add new API endpoints to documentation
3. Include usage examples

### Code Comments

- **Why** is more important than **what**
- Avoid obvious comments
- Keep comments updated with code

### API Documentation

Document every endpoint:
```markdown
### POST /api/expenses
Create new expense

**Request:**
\`\`\`json
{
  "amount": 500,
  "category": "FOOD"
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "id": "uuid",
  "amount": 500,
  "category": "FOOD"
}
\`\`\`
```

---

## Reporting Bugs

### Bug Report Template

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Do this
2. Then this
3. Bug occurs

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: Windows 10
- Node: 20.x
- pnpm: 10.x
- Browser: Chrome 120

## Screenshots
<!-- Attach if applicable -->

## Logs
<!-- Attach error logs if applicable -->
```

---

## Suggesting Features

### Feature Request Template

```markdown
## Description
Clear description of the feature

## Problem It Solves
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternative Approaches
Any alternatives considered?

## Additional Context
Any other information?

## Priority
- [ ] Low
- [ ] Medium
- [ ] High
- [ ] Critical
```

---

## Getting Help

- **Documentation**: Check [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
- **Issues**: Search existing issues first
- **Discussions**: Ask questions in GitHub Discussions
- **Email**: Contact maintainers

---

## License

By contributing, you agree your contributions will be licensed under the MIT License.

---

Thank you for contributing to Smart Tiffin Platform! 🚀
