# Test coverage report

Updated: 2026-09-17, API 4.2x synchronization branch.

`npm run test:coverage` passes: **333 tests in 33 files**, using Vitest 1.6.1 with V8 coverage and the repository's existing exclusions. This measures executed source code, separately from public API operation coverage and schema reachability.

| Measure | Coverage |
| --- | ---: |
| Statements | 67.42% |
| Branches | 72.70% |
| Functions | 72.29% |
| Lines | 67.42% |

The public period tool is exercised through MCP transport and mocked HTTP responses: query forwarding, pagination, timezone-valid dates rejected before network access, refreshed authentication, deletion metadata, compact references, field selection, item/byte limits and API errors. CREATE Story Points rejection and optional nullable link-type keys have regression coverage. Tests do not establish live TeamStorm response shapes, duration units or server defaults.

Regenerate with `npm run test:coverage`. Full per-file HTML and machine-readable results are emitted under `coverage/` (`index.html` and `coverage-final.json`); generated HTML/assets are not committed. Source inspection, typecheck, lint and build also pass. The API inventory is reported separately in [OpenAPI coverage](../openAPI-coverage-report.md).
