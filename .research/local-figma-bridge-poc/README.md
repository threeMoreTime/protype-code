# Local Codex ↔ Local Figma Bridge POC

This isolated proof of concept connects a local Codex stdio MCP server to a Figma Desktop Development Plugin through a loopback WebSocket. The plugin main thread performs document operations through the Figma Plugin API. The path does not use a Figma REST API, personal access token, public tunnel, remote MCP, browser automation, or Computer Use.

## Architecture and startup

```text
Codex stdio MCP server → IPv4 loopback WebSocket → Figma Desktop Development Plugin
```

The WebSocket server shares the MCP process lifecycle and binds only to IPv4 loopback. Keep the development plugin running while using the bridge; closing it ends the session. The plugin reconnects to its fixed local WebSocket endpoint when the MCP process restarts.

Install dependencies and run the local checks from this directory:

```powershell
npm ci --ignore-scripts
npm run build:plugin
npm test
npm run doctor
```

`npm test` builds the plugin UI and native design runtime, then runs protocol, authorization, ownership, DesignSpec, capture, runtime, recovery and delivery tests with synthetic identities. These tests do not verify a live Figma session. Follow the [current startup guide](../../docs/guide/getting-started.md) for the persistent workflow CLI or MCP client configuration. `npm start` serves stdio MCP and requires a client.

## Write safety

Reads can operate on a connected document. Pairing and every mutation require a stable file identity, an authenticated pairing, and a server-issued task authorization with the matching task and scope. A missing or unstable identity fails closed. Document names are descriptive metadata and are not an authorization boundary.

The server accepts local process configuration through:

- `LOCAL_FIGMA_BRIDGE_DENIED_FILE_IDENTITIES`
- `LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES`

Values use the format `figma-file:<local-value>` and can be separated by commas or newlines. Both lists default to empty, so pairing and writes are disabled until a stable identity is explicitly allowed. Deny entries take precedence over allow entries. Invalid configuration prevents the bridge from starting. Keep real file identities in local environment configuration only; never put them in source, examples, test fixtures, or reports.

The local authorization issuer is a development test utility. It accepts only identities in the local allowlist and writes its short-lived records under the ignored `state/` directory. Do not commit that directory, pairing secrets, authorization records, or runtime logs.

## Tool surface and limitations

The MCP tools expose status and scoped reads, task-owned frame operations, and `figma_scope_design_plan`, `figma_scope_design_apply`, `figma_scope_design_audit`, `figma_scope_design_export_png`. Design operations accept the bounded [DesignSpec contract](../../docs/reference/design-spec.md). Mutations enforce page/root ancestry and ownership before reaching the plugin. Arbitrary JavaScript execution, arbitrary file paths, unguarded delete, and MCP authorization issuance are not exposed. Legacy implicit POC write/export tools still reject requests.

An operation ID identifies one logical call separately from its transport request ID. Use the original ID to inspect an uncertain outcome; never blindly resend it. Each new design batch has a fresh operation ID and retains the same immutable spec and run identity. Design recovery verifies durable checkpoints and current node state; incomplete unrecorded writes still require inspection. See [generation and recovery](../../docs/guide/generation.md).

## Design request budget

Design operations default to a 40,000 ms transport timeout. `LOCAL_FIGMA_BRIDGE_DESIGN_TIMEOUT_MS` accepts a decimal integer from 40,000 through 180,000; invalid values prevent startup. The programmatic `createMcpServer({ designTimeoutMs })` option uses the same validation. This budget applies only to `figma_scope_design_*` operations and does not enable retries or bypass authorization, ownership or readback checks.

The persistent workflow CLI accepts optional `designTimeoutMs` in its session JSON, passes it to the MCP child, and allows an additional 5,000 ms for its Design tool calls. Other CLI tools retain their 45,000 ms timeout. An external MCP client must be configured separately: the generated Codex fragment keeps `tool_timeout_sec = 45`, so an opted-in 120,000 ms server budget requires a client tool timeout of at least 125 seconds. Restart the session from its configuration file after changing the value. See the [startup guide](../../docs/guide/getting-started.md).

A timeout does not cancel the plugin operation. Preserve the original operation ID and evidence, audit the actual document after reconnecting, then explicitly reconcile an unknown write outcome before another batch. A late response or a larger timeout does not authorize replay.

The normal 35-second heartbeat idle limit is deferred only while an authenticated, ready, open connection has a supported pending Design request before its original deadline, bounded to at most 180,000 ms. The connection object, connection ID, session ID and file identity must all match. This does not refresh `lastSeen` or renew the request timer; completion, timeout or pending removal restores the ordinary idle checks, which run every 5 seconds. Ordinary tools and stale, unauthenticated or unready connections receive no exemption.

## Evidence boundary

Automated tests use synthetic identities and simulated plugin responses. They establish local protocol behavior only. Live Figma Plugin API behavior, a clean-clone Codex startup/trust gate, production plugin eligibility, duplicate/save-as identity behavior, and full end-to-end acceptance are not verified by the automated suite. Treat any separately collected live evidence according to its own report and verification status.

Raw runtime logs, pairing state, authorization state, generated test output, and nested research repositories are excluded from the public source history.
