# Snakes and Ladders

A real-time multiplayer Snakes and Ladders web game built with modern technologies.

## Features

- **Real-time Multiplayer**: Play with friends using WebSocket connections
- **Independent Dice Rolling**: No turn-based waiting - everyone rolls when they want
- **Focused Viewport**: WebGL rendering with smooth camera following your token
- **Serverless Architecture**: AWS Lambda, DynamoDB, and API Gateway

## Quick Start

### Create a Game

1. Enter your name
2. Click "Create Game"
3. Share the 6-character game code with friends

### Join a Game

1. Enter your name
2. Enter the game code
3. Click "Join Game"

### Play

- Click "Roll Dice" to move your token
- Land on ladders to climb up
- Avoid snakes that slide you down
- First to reach position 100 wins!

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind + WebGL |
| Backend | AWS Lambda + Node.js |
| Database | DynamoDB (Single Table Design) |
| Real-time | API Gateway WebSockets |
| Infrastructure | Terraform |
| CI/CD | GitHub Actions with OIDC |

## Project Structure

```
snakes-and-ladders/
├── packages/
│   ├── frontend/     # React + WebGL app
│   ├── backend/      # Lambda functions
│   └── shared/       # Shared TypeScript types
├── infrastructure/   # Terraform modules
├── docs/             # This documentation
└── .github/          # CI/CD workflows
```

## Development

See the [Development Setup](development/setup.md) guide to get started.

## License

MIT License - see [LICENSE](https://github.com/reaandrew/snakes-and-ladders/blob/main/LICENSE) for details.
