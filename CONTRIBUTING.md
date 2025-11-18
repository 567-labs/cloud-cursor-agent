# Contributing to Cloud Agent CLI

Thank you for your interest in contributing to the Cloud Agent CLI! We welcome contributions from the community to help make this tool better.

## Getting Started

### Prerequisites

- **Node.js** (v18 or later)
- **Bun** (v1.0 or later) - We use Bun for development, testing, and building.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jxnl/cloud-cursor-agent.git
   cd cloud-cursor-agent
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

## Development

To run the CLI in development mode:

```bash
bun run dev
```

This runs `cloud-agent.tsx` directly using Bun.

## Testing

We use Bun's built-in test runner.

Run all tests:

```bash
bun test
```

Run tests in watch mode:

```bash
bun run test:watch
```

Run tests with coverage:

```bash
bun run test:coverage
```

## Code Style

We use **Prettier** for code formatting.

Check formatting:

```bash
bun run format:check
```

Fix formatting:

```bash
bun run format
```

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes (`bun test`).
4. Ensure your code matches the existing style (`bun run format:check`).
5. Update the documentation if you've changed the CLI interface.
6. Open a Pull Request.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
