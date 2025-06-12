import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { retry } from "./utils/retry.js";

const DOVETAIL_URL = "https://dovetail.com/api/v1";
const DOVETAIL_API_TOKEN = process.env.DOVETAIL_API_TOKEN;

// Reusable HTTP request function with retry logic
async function makeDovetailRequest(endpoint: string) {
  const makeRequest = async () => {
    const response = await fetch(`${DOVETAIL_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${DOVETAIL_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Dovetail API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  return retry(makeRequest, {
    maxRetries: 3,
    delayMs: 1000,
    delayType: "exponential",
    retryIf: (err: unknown) => {
      // Retry on network errors or 5xx server errors
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        // Retry on network errors (fetch failures)
        if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
          return true;
        }
        // Retry on 5xx server errors
        if (
          errorMessage.includes("500") ||
          errorMessage.includes("502") ||
          errorMessage.includes("503") ||
          errorMessage.includes("504")
        ) {
          return true;
        }
      }
      return false;
    },
    onRetry: (attempt: number, totalAttempts: number) => {
      // Log retry attempts to stderr (allowed in MCP servers)
      // eslint-disable-next-line no-console
      console.error(`Dovetail API request failed, retrying (${attempt}/${totalAttempts}): ${endpoint}`);
    },
  });
}

// Create MCP server
const server = new McpServer({
  name: "dovetail-mcp-server",
  version: "0.1.0",
});

// Register tools
server.tool(
  "get_project_insight",
  "Get a specific insight by ID",
  {
    insight_id: { type: "string", description: "The ID of the insight to retrieve" },
  },
  async ({ insight_id }) => {
    const data = await makeDovetailRequest(`/insights/${insight_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "list_project_insights",
  "List insights for a specific project",
  {
    project_id: { type: "string", description: "The ID of the project to list insights for" },
  },
  async ({ project_id }) => {
    const data = await makeDovetailRequest(`/insights?filter[project_id]=${project_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_data_content",
  "Get data content in markdown format",
  {
    data_id: { type: "string", description: "The ID of the data to get content for" },
  },
  async ({ data_id }) => {
    const data = await makeDovetailRequest(`/data/${data_id}/export/markdown`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_project_data",
  "Get specific project data by ID",
  {
    data_id: { type: "string", description: "The ID of the data to retrieve" },
  },
  async ({ data_id }) => {
    const data = await makeDovetailRequest(`/data/${data_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "list_project_data",
  "List data for a specific project",
  {
    project_id: { type: "string", description: "The ID of the project to list data for" },
  },
  async ({ project_id }) => {
    const data = await makeDovetailRequest(`/data?filter[project_id]=${project_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool("get_dovetail_projects", "Get all Dovetail projects", {}, async () => {
  const data = await makeDovetailRequest("/projects");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error("Dovetail MCP server running on stdio");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Server error:", error);
  process.exit(1);
});
