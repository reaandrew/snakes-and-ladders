# Development Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- Terraform 1.7+
- AWS CLI configured
- aws-vault (recommended)

## Clone and Install

```bash
git clone https://github.com/reaandrew/snakes-and-ladders.git
cd snakes-and-ladders
pnpm install
```

## Project Structure

```
packages/
├── frontend/    # React + WebGL app
├── backend/     # Lambda functions
└── shared/      # Shared TypeScript types
```

## Development Commands

### Build All

```bash
pnpm build
```

### Run Tests

```bash
# All tests
pnpm test

# With coverage
pnpm test:coverage

# Specific package
pnpm --filter @snakes-and-ladders/frontend test
```

### Lint and Format

```bash
# Lint
pnpm lint

# Fix lint issues
pnpm lint:fix

# Check formatting
pnpm format:check

# Fix formatting
pnpm format
```

### Type Check

```bash
pnpm typecheck
```

### Frontend Development

```bash
pnpm dev:frontend
```

Opens at http://localhost:3000

### Storybook

```bash
pnpm storybook
```

Opens at http://localhost:6006

## Local Testing

### DynamoDB Local

For integration testing without AWS:

```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

Configure backend to use local endpoint:

```typescript
const repository = new Repository({
  tableName: 'test-table',
  clientConfig: {
    endpoint: 'http://localhost:8000',
    region: 'local',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  },
});
```

### Environment Variables

Create `.env.local` for frontend:

```env
VITE_WS_URL=ws://localhost:3001
VITE_API_URL=http://localhost:3002
```

## IDE Setup

### VS Code

Recommended extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Git Hooks

Lefthook runs automatically on commit:

- **pre-commit**: Lint, format, typecheck staged files
- **commit-msg**: Validate conventional commit format

### Commit Message Format

```
type(scope): description

feat(game): add snake animation
fix(ws): handle reconnection
docs: update API documentation
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
