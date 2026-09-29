# Local Codex ↔ Local Figma Bridge POC

This isolated proof of concept connects a local Codex stdio MCP server to a Figma Desktop Development Plugin through a loopback WebSocket. The plugin main thread performs document operations through the Figma Plugin API. The path does not use a Figma REST API, personal access token, public tunnel, remote MCP, browser automation, or Computer Use.

## Architecture and startup

```text
Codex stdio MCP server → IPv4 loopback WebSocket → Figma Desktop Development Plugin
```

The WebSocket server shares the MCP process lifecycle and binds only to IPv4 loopback. Keep the development plugin running while using the bridge; closing it ends the session. The plugin reconnects to its fixed local WebSocket endpoint when the MCP process restarts.

Install dependencies and run the local checks from this directory:

```powershell
npm install
npm run build:plugin-ui
npm test
npm start
```

`npm test` builds the plugin UI and runs automated protocol, authorization, ownership, and audit tests with synthetic identities. These tests do not verify a live Figma session.

## Write safety

Reads can operate on a connected document. Pairing and every mutation require a stable file identity, an authenticated pairing, and a server-issued task authorization with the matching task and scope. A missing or unstable identity fails closed. Document names are descriptive metadata and are not an authorization boundary.

The server accepts local process configuration through:

- `LOCAL_FIGMA_BRIDGE_DENIED_FILE_IDENTITIES`
- `LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES`

Values use the format `figma-file:<local-value>` and can be separated by commas or newlines. Both lists default to empty, so pairing and writes are disabled until a stable identity is explicitly allowed. Deny entries take precedence over allow entries. Invalid configuration prevents the bridge from starting. Keep real file identities in local environment configuration only; never put them in source, examples, test fixtures, or reports.

The local authorization issuer is a development test utility. It accepts only identities in the local allowlist and writes its short-lived records under the ignored `state/` directory. Do not commit that directory, pairing secrets, authorization records, or runtime logs.

## Tool surface and limitations

The MCP tools expose status and scoped reads, plus task-owned create, update, delete, prototype, export, and operation-reconciliation operations. Mutations enforce page/root ancestry and ownership before reaching the plugin. Arbitrary JavaScript execution, arbitrary file paths, unguarded delete, and MCP authorization issuance are not exposed.

An operation ID identifies one logical mutation separately from its transport request ID. Reuse the same operation ID when investigating a timed-out mutation. A timeout does not prove that the mutation failed; read-only reconciliation is available for scoped create operations. General reconciliation for other mutation types and crash consistency are not implemented.

## Evidence boundary

Automated tests use synthetic identities and simulated plugin responses. They establish local protocol behavior only. Live Figma Plugin API behavior, a clean-clone Codex startup/trust gate, production plugin eligibility, duplicate/save-as identity behavior, and full end-to-end acceptance are not verified by the automated suite. Treat any separately collected live evidence according to its own report and verification status.

Raw runtime logs, pairing state, authorization state, generated test output, and nested research repositories are excluded from the public source history.
