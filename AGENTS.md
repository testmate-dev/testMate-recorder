# AGENTS.md - Development Guide for TestMate Recorder

## Build Commands

### Building All Packages
```bash
yarn build                    # Build root packages (recorder, postprocessor, commons)
yarn workspaces foreach -p run build  # Build all workspaces
```

### Building Individual Packages
```bash
# Babel-based packages (most packages)
yarn workspace tmr-commons build
yarn workspace tmr-postprocessor build

# Webpack-based package (browser extension)
cd packages/tmr-recorder && yarn build

# TypeScript package (includes type checking)
cd packages/tmr-model && yarn build
```

### Watching for Changes
```bash
yarn watch                    # Watch root packages
yarn workspace tmr-commons watch
cd packages/tmr-recorder && yarn watch
```

## Test Commands

### Running Tests
```bash
# Run all tests
yarn test

# Run a single test file
yarn jest packages/tmr-postprocessor/__tests__/index.spec.js --no-coverage

# Run tests matching a pattern
yarn jest --testPathPattern="recorder"

# Update snapshots
yarn jest -u
```

### Note on Test Setup
- Tests use Jest with Babel transpilation
- Some packages require building dependencies first (tmr-commons, tmr-model)
- Run `yarn workspace tmr-commons build` before testing packages that depend on it

## Code Style Guidelines

Note: This project does not currently use ESLint or Prettier. Code style follows the conventions below.

### File Headers
All source files must include the Apache 2.0 license header:
```javascript
// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
```

### Naming Conventions
- **Classes**: PascalCase (e.g., `Recorder`, `Playback`)
- **Functions/variables**: camelCase (e.g., `parseLocator`, `userAgent`)
- **Constants**: UPPER_SNAKE_CASE for truly constant values
- **Files**: kebab-case for JS files (e.g., `record-handlers.js`)

### JSDoc Comments
Use JSDoc for all public APIs:
```javascript
/**
 * Parses a Selenium locator, returning its type and the unprefixed locator
 * string as an object.
 *
 * @param locator the locator to parse
 * @returns {{type: string, string: string}}
 */
export function parseLocator(locator) { ... }
```

### Import Style
- Use ES6 import syntax
- Group imports: external first, then internal
```javascript
import browser from 'webextension-polyfill'
import { handlers, observers } from './record-handlers'
import { attach, detach } from './prompt-injector'
```

### Error Handling
- Use descriptive error messages
- Prefer specific error types (TypeError, Error)
- Example: `throw new TypeError('Locator cannot be empty')`

### Class Structure
```javascript
export default class Recorder {
  constructor(window) {
    this.window = window
    this.eventListeners = {}
    this.bindMethods()
  }

  bindMethods() {
    this.recalculateFrameLocation = this.recalculateFrameLocation.bind(this)
  }
}
```

### Testing Patterns
- Use Jest with snapshot testing
- Test files: `__tests__/*.spec.js` or `**/*.spec.js`
- Use `describe` and `it` blocks
- Update snapshots with `yarn jest -u` when changes are intentional

### TypeScript (tmr-model only)
- Strict mode enabled in tsconfig.json
- Type checking: `cd packages/tmr-model && yarn build` (runs tsc)
- Use proper typing in function signatures
- Follow existing patterns in `packages/tmr-model/src/`

### Browser Extension (tmr-recorder)
- Use `webextension-polyfill` for cross-browser compatibility
- Content scripts, background scripts, and UI components in `src/content/`, `src/background/`, `src/ui/`

## Package Structure

```
packages/
├── tmr-commons/     # Shared utilities and events
├── tmr-postprocessor/  # Recording postprocessing
├── tmr-recorder/    # WebExtension recorder (webpack)
├── tmr-model/       # Data models (TypeScript)
├── tmr-runtime/     # Playback and execution
├── tmr-migrate/     # Format migrations
├── tmr-cli/         # Command-line interface
├── tmr-ide/         # IDE integration
├── tmr-testkit/     # Testing utilities
└── tmr-webdriver-testkit/  # WebDriver testing
```

## Common Tasks

### Adding a new package
1. Create package in `packages/<package-name>/`
2. Add `package.json` with name, scripts, dependencies
3. Add to root `package.json` workspaces if needed
4. Add build script using babel or webpack

### Running the extension
```bash
cd packages/tmr-recorder && yarn build
# Load the dist/ folder as unpacked extension in browser
```