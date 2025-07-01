#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { GitHubManager } from './github-manager.js';

// Load .env file only if GITHUB_TOKENS is not already set
if (!process.env.GITHUB_TOKENS) {
  dotenv.config();
}

const server = new Server({
  name: 'github-mcp-server',
  version: '1.0.0',
});

const githubManager = new GitHubManager();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_latest_release',
        description: 'Get the latest release information from a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner/organization name',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            tokens: {
              type: 'string',
              description:
                'Comma-separated GitHub Personal Access Tokens (optional if set in environment)',
            },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'get_repository_content',
        description: 'Get content from a GitHub repository file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner/organization name',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            path: {
              type: 'string',
              description: 'File or directory path in the repository',
              default: '',
            },
            ref: {
              type: 'string',
              description: 'Git reference (branch, tag, or commit)',
              default: 'main',
            },
            tokens: {
              type: 'string',
              description:
                'Comma-separated GitHub Personal Access Tokens (optional if set in environment)',
            },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'list_repositories',
        description: 'List repositories for an organization or user',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Organization or user name',
            },
            type: {
              type: 'string',
              enum: ['all', 'owner', 'member'],
              description: 'Type of repositories to list',
              default: 'all',
            },
            tokens: {
              type: 'string',
              description:
                'Comma-separated GitHub Personal Access Tokens (optional if set in environment)',
            },
          },
          required: ['owner'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_latest_release': {
        const { owner, repo, tokens } = args as { owner: string; repo: string; tokens?: string };
        const release = await githubManager.getLatestRelease(owner, repo, tokens);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(release, null, 2),
            },
          ],
        };
      }

      case 'get_repository_content': {
        const {
          owner,
          repo,
          path = '',
          ref = 'main',
          tokens,
        } = args as {
          owner: string;
          repo: string;
          path?: string;
          ref?: string;
          tokens?: string;
        };
        const content = await githubManager.getRepositoryContent(owner, repo, path, ref, tokens);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(content, null, 2),
            },
          ],
        };
      }

      case 'list_repositories': {
        const {
          owner,
          type = 'all',
          tokens,
        } = args as { owner: string; type?: string; tokens?: string };
        const repos = await githubManager.listRepositories(owner, type, tokens);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(repos, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GitHub MCP Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
