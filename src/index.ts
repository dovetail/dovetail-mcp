import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
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

// Reusable date format schema
const dateFormatSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{6})?(Z|[+-]\d{4})?)?$/,
    "Date must be in format: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, YYYY-MM-DDTHH:MM:SSZ, YYYY-MM-DDTHH:MM:SS+0000, or YYYY-MM-DDTHH:MM:SS.SSSSSS+0000"
  );

// Reusable created_at filter schema
const createdAtFilterSchema = z
  .object({
    gt: dateFormatSchema.describe("Greater than date").optional(),
    gte: dateFormatSchema.describe("Greater than or equal to date").optional(),
    lt: dateFormatSchema.describe("Less than date").optional(),
    lte: dateFormatSchema.describe("Less than or equal to date").optional(),
  })
  .describe("Date filter parameters")
  .optional();

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
    page: z
      .object({
        start_cursor: z.string().describe("Cursor to start from").optional(),
        limit: z.number().describe("Number of items per page (0-100)").optional(),
      })
      .describe("Pagination parameters")
      .optional(),
    filter: z
      .object({
        created_at: createdAtFilterSchema,
        project_id: z
          .union([z.string().describe("Single project ID"), z.array(z.string()).describe("Array of project IDs")])
          .describe("Project ID or array of project IDs")
          .optional(),
        published: z.boolean().describe("Filter by published status").optional(),
        title: z
          .object({
            contains: z.string().describe("Substring match").optional(),
            equal_to: z.string().describe("Exact match").optional(),
          })
          .describe("Title filter parameters")
          .optional(),
      })
      .describe("Filter parameters")
      .optional(),
    sort: z
      .union([z.string(), z.array(z.string())])
      .describe("Sort parameters in format 'property:direction' or array of such strings")
      .optional(),
  },
  async ({ page, filter, sort }) => {
    const params = new URLSearchParams();

    if (page) {
      if (page.start_cursor != null && page.start_cursor.length > 0) {
        params.append("page[start_cursor]", page.start_cursor);
      }
      if (page.limit != null) {
        params.append("page[limit]", page.limit.toString());
      }
    }

    if (filter?.project_id != null) {
      if (Array.isArray(filter.project_id)) {
        filter.project_id.forEach((id: string, i: number) => {
          if (id && id.length > 0) {
            params.append(`filter[project_id][${i}]`, id);
          }
        });
      } else if (filter.project_id.length > 0) {
        params.append("filter[project_id]", filter.project_id);
      }
    }

    if (filter?.published !== undefined) {
      params.append("filter[published]", filter.published.toString());
    }

    if (filter?.title) {
      if (filter.title.contains != null && filter.title.contains.length > 0) {
        params.append("filter[title][contains]", filter.title.contains);
      }
      if (filter.title.equal_to != null && filter.title.equal_to.length > 0) {
        params.append("filter[title][equal_to]", filter.title.equal_to);
      }
    }

    if (sort != null) {
      const sortArray = Array.isArray(sort) ? sort : [sort];
      sortArray.forEach((s, i) => {
        if (s && s.length > 0) {
          params.append(`sort[${i}]`, s);
        }
      });
    }

    const queryString = params.toString();
    const data = await makeDovetailRequest(`/insights${queryString ? `?${queryString}` : ""}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_data_content",
  "Get data content in markdown format",
  {
    data_id: z.string().describe("The ID of the data to retrieve"),
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
    data_id: z.string().describe("The ID of the data to retrieve"),
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
    page: z
      .object({
        start_cursor: z.string().describe("Cursor to start from").optional(),
        limit: z.number().describe("Number of items per page (0-100)").optional(),
      })
      .describe("Pagination parameters")
      .optional(),
    filter: z
      .object({
        created_at: createdAtFilterSchema,
        project_id: z
          .union([z.string().describe("Single project ID"), z.array(z.string()).describe("Array of project IDs")])
          .describe("Project ID or array of project IDs")
          .optional(),
        title: z
          .object({
            contains: z.string().describe("Substring match").optional(),
            equal_to: z.string().describe("Exact match").optional(),
          })
          .describe("Title filter parameters")
          .optional(),
      })
      .describe("Filter parameters")
      .optional(),
    sort: z
      .union([z.string(), z.array(z.string())])
      .describe("Sort parameters in format 'property:direction' or array of such strings")
      .optional(),
  },
  async ({ page, filter, sort }) => {
    const params = new URLSearchParams();

    if (page) {
      if (page.start_cursor != null && page.start_cursor.length > 0) {
        params.append("page[start_cursor]", page.start_cursor);
      }
      if (page.limit != null) {
        params.append("page[limit]", page.limit.toString());
      }
    }

    if (filter?.created_at) {
      if (filter.created_at.gt != null && filter.created_at.gt.length > 0) {
        params.append("filter[created_at][gt]", filter.created_at.gt);
      }
      if (filter.created_at.gte != null && filter.created_at.gte.length > 0) {
        params.append("filter[created_at][gte]", filter.created_at.gte);
      }
      if (filter.created_at.lt != null && filter.created_at.lt.length > 0) {
        params.append("filter[created_at][lt]", filter.created_at.lt);
      }
      if (filter.created_at.lte != null && filter.created_at.lte.length > 0) {
        params.append("filter[created_at][lte]", filter.created_at.lte);
      }
    }

    if (filter?.project_id != null) {
      if (Array.isArray(filter.project_id)) {
        filter.project_id.forEach((id: string, i: number) => {
          if (id && id.length > 0) {
            params.append(`filter[project_id][${i}]`, id);
          }
        });
      } else if (filter.project_id.length > 0) {
        params.append("filter[project_id]", filter.project_id);
      }
    }

    if (filter?.title) {
      if (filter.title.contains != null && filter.title.contains.length > 0) {
        params.append("filter[title][contains]", filter.title.contains);
      }
      if (filter.title.equal_to != null && filter.title.equal_to.length > 0) {
        params.append("filter[title][equal_to]", filter.title.equal_to);
      }
    }

    if (sort != null) {
      const sortArray = Array.isArray(sort) ? sort : [sort];
      sortArray.forEach((s, i) => {
        if (s && s.length > 0) {
          params.append(`sort[${i}]`, s);
        }
      });
    }

    const queryString = params.toString();
    const data = await makeDovetailRequest(`/data${queryString ? `?${queryString}` : ""}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_dovetail_projects",
  "Get all Dovetail projects",
  {
    page: z
      .object({
        start_cursor: z.string().describe("Cursor to start from").optional(),
        limit: z.number().describe("Number of items per page (0-100)").optional(),
      })
      .describe("Pagination parameters")
      .optional(),
    filter: z
      .object({
        title: z
          .object({
            contains: z.string().describe("Substring match").optional(),
            equal_to: z.string().describe("Exact match").optional(),
          })
          .describe("Title filter parameters"),
      })
      .describe("Filter parameters")
      .optional(),
    sort: z
      .union([z.string(), z.array(z.string())])
      .describe("Sort parameters in format 'property:direction' or array of such strings")
      .optional(),
  },
  async ({ page, filter, sort }) => {
    const params = new URLSearchParams();

    if (page !== undefined) {
      if (page.start_cursor != null) {
        params.append("page[start_cursor]", page.start_cursor);
      }
      if (page.limit !== undefined) {
        params.append("page[limit]", page.limit.toString());
      }
    }

    if (filter?.title) {
      if (filter.title.contains != null) {
        params.append("filter[title][contains]", filter.title.contains);
      }
      if (filter.title.equal_to != null) {
        params.append("filter[title][equal_to]", filter.title.equal_to);
      }
    }

    if (sort !== undefined) {
      const sortArray = Array.isArray(sort) ? sort : [sort];
      sortArray.forEach((s, i) => {
        params.append(`sort[${i}]`, s);
      });
    }

    const queryString = params.toString();
    const data = await makeDovetailRequest(`/projects${queryString ? `?${queryString}` : ""}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "list_personal_project_insights",
  "List insights for a specific user's projects",
  {
    user_id: z.string().describe("The ID of the user to list insights for"),
    page: z
      .object({
        start_cursor: z.string().describe("Cursor to start from").optional(),
        limit: z.number().describe("Number of items per page (0-100)").optional(),
      })
      .describe("Pagination parameters")
      .optional(),
    filter: z
      .object({
        created_at: createdAtFilterSchema,
        project_id: z
          .union([z.string().describe("Single project ID"), z.array(z.string()).describe("Array of project IDs")])
          .describe("Project ID or array of project IDs")
          .optional(),
        published: z.boolean().describe("Filter by published status").optional(),
        title: z
          .object({
            contains: z.string().describe("Substring match").optional(),
            equal_to: z.string().describe("Exact match").optional(),
          })
          .describe("Title filter parameters")
          .optional(),
      })
      .describe("Filter parameters")
      .optional(),
    sort: z
      .union([z.string(), z.array(z.string())])
      .describe("Sort parameters in format 'property:direction' or array of such strings")
      .optional(),
  },
  async ({ user_id, page, filter, sort }) => {
    const params = new URLSearchParams();

    if (page) {
      if (page.start_cursor != null && page.start_cursor.length > 0) {
        params.append("page[start_cursor]", page.start_cursor);
      }
      if (page.limit != null) {
        params.append("page[limit]", page.limit.toString());
      }
    }

    if (filter?.project_id != null) {
      if (Array.isArray(filter.project_id)) {
        filter.project_id.forEach((id: string, i: number) => {
          if (id && id.length > 0) {
            params.append(`filter[project_id][${i}]`, id);
          }
        });
      } else if (filter.project_id.length > 0) {
        params.append("filter[project_id]", filter.project_id);
      }
    }

    if (filter?.published !== undefined) {
      params.append("filter[published]", filter.published.toString());
    }

    if (filter?.title) {
      if (filter.title.contains != null && filter.title.contains.length > 0) {
        params.append("filter[title][contains]", filter.title.contains);
      }
      if (filter.title.equal_to != null && filter.title.equal_to.length > 0) {
        params.append("filter[title][equal_to]", filter.title.equal_to);
      }
    }

    if (sort != null) {
      const sortArray = Array.isArray(sort) ? sort : [sort];
      sortArray.forEach((s, i) => {
        if (s && s.length > 0) {
          params.append(`sort[${i}]`, s);
        }
      });
    }

    const queryString = params.toString();
    const data = await makeDovetailRequest(`/insights/user/${user_id}${queryString ? `?${queryString}` : ""}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

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
