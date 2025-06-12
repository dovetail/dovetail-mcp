# Dovetail MCP Server

A Model Context Protocol (MCP) server for interacting with the Dovetail API.

## Prerequisites

- Node.js 22 or higher
   - You can try this on a previous version, but you'll need to configure this yourself!
- A Dovetail API token (see [Dovetail API Documentation](https://developers.dovetail.com/docs/introduction) for details on obtaining one)

## Installation

### Option 1: Pre-compiled Script

1. Download the latest release from the [GitHub releases page](https://github.com/dovetail/mcp/releases)
2. Place the file somewhere you'll remember
3. Head over to configuration!

### Option 2: Setup from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/dovetail/mcp.git
   cd mcp
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Build the project:
   ```bash
   yarn build
   ```

4. Grab the `index.js` file from `dist/` and put it somewhere you'll remember.

## Configuration

We recommend setting this up in a MCP client like Claude for Desktop. To do this in Claude, add the following to your configuration:

```
    "mcp": {
      "command": "node",
      "args": [<path-to-your-index-js-file>],
      "env": {
        "DOVETAIL_API_TOKEN": "<YOUR_TOKEN>"
      }
    }
```

## License

MIT


