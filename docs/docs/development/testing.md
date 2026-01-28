# Testing

## Overview

The project uses Vitest for all JavaScript/TypeScript testing with 80% coverage targets.

## Running Tests

```bash
# All packages
pnpm test

# With coverage report
pnpm test:coverage

# Specific package
pnpm --filter @snakes-and-ladders/backend test
pnpm --filter @snakes-and-ladders/frontend test
pnpm --filter @snakes-and-ladders/shared test

# Watch mode (development)
pnpm --filter @snakes-and-ladders/backend dev
```

## Test Structure

### Backend Tests

```
packages/backend/src/
├── lib/
│   ├── board/
│   │   ├── board.service.ts
│   │   └── board.service.test.ts
│   └── game/
│       ├── game.service.ts
│       └── game.service.test.ts
```

Test the business logic library, not Lambda handlers.

### Frontend Tests

```
packages/frontend/src/
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Button.test.tsx
│       └── Button.stories.tsx
└── webgl/
    ├── camera.ts
    ├── camera.test.ts
    └── renderer.test.ts
```

Components have both unit tests and Storybook stories.

### Shared Tests

```
packages/shared/src/
└── types/
    ├── game.types.ts
    ├── game.types.test.ts
    └── dynamodb.types.test.ts
```

Test type utilities and constants.

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameService } from './game.service';

describe('GameService', () => {
  let gameService: GameService;
  let mockRepository: MockRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    gameService = new GameService({ repository: mockRepository });
  });

  describe('createGame', () => {
    it('should create a game with unique code', async () => {
      const result = await gameService.createGame('Alice');

      expect(result.success).toBe(true);
      expect(result.data.game.code).toHaveLength(6);
    });
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Coverage Requirements

All packages require 80% coverage:

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 80% |
| Statements | 80% |

Coverage reports are generated in `packages/*/coverage/`.

## Mocking

### Mock Repository

```typescript
const mockRepository = {
  getGame: vi.fn(),
  putGame: vi.fn(),
  getPlayer: vi.fn(),
  // ...
};
```

### Mock WebSocket

```typescript
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
};
global.WebSocket = vi.fn(() => mockWebSocket);
```

## Storybook

Visual testing and component documentation:

```bash
pnpm storybook
```

### Story Example

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: {
    children: 'Click me',
    variant: 'primary',
  },
};
```

## CI Integration

Tests run automatically in GitHub Actions:

1. Frontend and backend tests run in parallel
2. Coverage reports uploaded as artifacts
3. SonarQube analyzes coverage data
4. Build fails if coverage below 80%
