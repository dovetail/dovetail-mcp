# Dovetail MCP Server

A Model Context Protocol (MCP) server that provides access to Dovetail's user research platform. This server enables AI assistants to interact with Dovetail projects, insights, highlights, and data through standardized tools and prompts.

## Features

- **Project Management**: List and access Dovetail projects
- **Insights**: Retrieve and list project insights
- **Highlights**: Access project highlights and findings
- **Data Access**: Get project data in various formats including markdown export
- **Research Analysis**: Built-in prompts for analyzing user feedback and opinions

## Setup

1. **Environment Variables**

   ```bash
   export DOVETAIL_API_TOKEN="your-dovetail-api-token"
   ```

2. **Install Dependencies**

   ```bash
   yarn install
   ```

3. **Start the Server**
   ```bash
   yarn start
   ```

## Available Tools

### Project Tools

- `get_dovetail_projects` - Get all Dovetail projects
- `list_project_data` - List data for a specific project
- `get_project_data` - Get specific project data by ID
- `get_data_content` - Get data content in markdown format

### Insights & Highlights

- `list_project_insights` - List insights for a specific project
- `get_project_insight` - Get a specific insight by ID
- `get_project_highlights` - Get highlights for a specific project

## Available Prompts

- `explain_thoughts` - Analyze what a specific person thinks about a product (currently configured for Zotify analysis)
  - This is just an example at this stage of what you can do with prompts

## Resources

- `App Information` - Provide what's in this README to the LLM
  - This is just an example of how to use resources

## Configuration

The server connects to Dovetail's API at `https://dovetail.com/api/v1` and includes:

- Automatic retry logic for failed requests
- Exponential backoff for rate limiting
- Error handling for network and server issues

## Usage with MCP Clients

This server implements the Model Context Protocol and can be used with any MCP-compatible client. Configure your client to connect to this server via stdio transport.

## Development

- **Build**: `yarn build`
- **Lint**: `yarn test.eslint`
- **Type Check**: `yarn test.tsc`
- **Format**: `yarn fix.prettier`

## Error Handling

The server includes robust error handling with:

- Automatic retries for 5xx server errors and network issues
- Exponential backoff delays
- Detailed error logging to stderr
