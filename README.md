# Dovetail MCP Server

A Model Context Protocol (MCP) server for connecting AI tools to the Dovetail API.

## Prerequisites

- Node.js 22 or higher (download Node from [nodejs.org](https://nodejs.org/))
- A Dovetail API token (see [Dovetail API Documentation](https://developers.dovetail.com/docs/introduction) for details on obtaining one)

## Installation

### Option 1: Download Pre-built Script

1. Download the latest `index.js` [here](https://github.com/dovetail/dovetail-mcp/releases/latest/download/index.js)
2. Head over to [configuration](#configuration) to continue

### Option 2: Setup from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/dovetail/dovetail-mcp.git
   cd dovetail-mcp
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Build the project:
   ```bash
   yarn build
   ```

4. Locate and copy the `dist/index.js` filepath (this will copy the path to your clipboard for the configuration step):
   ```bash
   realpath dist/index.js | pbcopy
   ```

## Configuration

We recommend setting this up in an MCP client like Claude or Cursor by entering the following:
>Claude: Please see the [MCP website](https://modelcontextprotocol.io/quickstart/user) for step by step instructions

>Cursor: Navigate to **Settings → Tools & Integrations → Add Custom MCP**

```
{
  "mcpServers": {
    "dovetail-mcp": {
      "command": "node",
      "args": ["<path-to-your-index-js-file>"],
      "env": {
        "DOVETAIL_API_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

## License

MIT


