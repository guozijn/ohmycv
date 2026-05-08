# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Playwright smoke tests (`tests/landing.spec.js`) covering terminal render, greeting, command handling (`whoami`, `cv`), and locale-driven `html lang` attribute.

### Changed

- Extracted config and i18n loaders from `home.js` into `home/config.js`. Behavior unchanged.
- Extracted terminal command system from `home.js` into `home/console.js` behind a single `initConsole({ data })` entry. `home.js` is now an entry orchestrator at 54 lines.
