import { Octokit } from '@octokit/rest';

interface GitHubToken {
  token: string;
  octokit: Octokit;
  rateLimitRemaining: number;
  rateLimitReset: number;
}

export class GitHubManager {
  private tokens: GitHubToken[] = [];
  private currentTokenIndex = 0;

  constructor() {
    // Try to initialize from environment variables
    this.initializeFromEnvironment();
  }

  private initializeFromEnvironment() {
    const tokensEnv = process.env.GITHUB_TOKENS;
    if (tokensEnv) {
      this.initializeTokensFromString(tokensEnv);
    }
  }

  private initializeTokensFromString(tokensString: string) {
    const tokenStrings = tokensString.split(',').map(token => token.trim());

    this.tokens = tokenStrings.map(token => ({
      token,
      octokit: new Octokit({ auth: token }),
      rateLimitRemaining: 5000,
      rateLimitReset: Date.now() + 3600000, // 1 hour from now
    }));

    if (this.tokens.length === 0) {
      throw new Error('At least one GitHub token is required');
    }
  }

  private async getAvailableOctokit(): Promise<Octokit> {
    if (this.tokens.length === 0) {
      // Return unauthenticated Octokit for public repositories
      console.warn(
        '⚠️  No GitHub tokens available. Using unauthenticated API (limited to public repositories and lower rate limits).'
      );
      return new Octokit();
    }

    const now = Date.now();

    // Find a token with remaining rate limit
    for (let i = 0; i < this.tokens.length; i++) {
      const tokenIndex = (this.currentTokenIndex + i) % this.tokens.length;
      const tokenInfo = this.tokens[tokenIndex];

      // Reset rate limit if time has passed
      if (now > tokenInfo.rateLimitReset) {
        tokenInfo.rateLimitRemaining = 5000;
        tokenInfo.rateLimitReset = now + 3600000;
      }

      if (tokenInfo.rateLimitRemaining > 10) {
        this.currentTokenIndex = tokenIndex;
        return tokenInfo.octokit;
      }
    }

    // If no tokens available, wait for the next reset
    const nextReset = Math.min(...this.tokens.map(t => t.rateLimitReset));
    const waitTime = nextReset - now;

    if (waitTime > 0) {
      console.error(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.getAvailableOctokit();
    }

    // Fallback to first token
    this.currentTokenIndex = 0;
    return this.tokens[0].octokit;
  }

  private async updateRateLimit(response: any) {
    const rateLimit = response.headers['x-ratelimit-remaining'];
    const rateLimitReset = response.headers['x-ratelimit-reset'];

    if (rateLimit && rateLimitReset) {
      const tokenInfo = this.tokens[this.currentTokenIndex];
      tokenInfo.rateLimitRemaining = parseInt(rateLimit);
      tokenInfo.rateLimitReset = parseInt(rateLimitReset) * 1000;
    }
  }

  async getLatestRelease(owner: string, repo: string, tokens?: string) {
    if (tokens) {
      this.initializeTokensFromString(tokens);
    }
    const octokit = await this.getAvailableOctokit();

    try {
      const response = await octokit.rest.repos.getLatestRelease({
        owner,
        repo,
      });

      await this.updateRateLimit(response);

      return {
        tag_name: response.data.tag_name,
        name: response.data.name,
        body: response.data.body,
        published_at: response.data.published_at,
        html_url: response.data.html_url,
        assets: response.data.assets.map(asset => ({
          name: asset.name,
          download_count: asset.download_count,
          browser_download_url: asset.browser_download_url,
          size: asset.size,
        })),
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found or no releases available`);
      }
      throw error;
    }
  }

  async getRepositoryContent(
    owner: string,
    repo: string,
    path: string = '',
    ref: string = 'main',
    tokens?: string
  ) {
    if (tokens) {
      this.initializeTokensFromString(tokens);
    }
    const octokit = await this.getAvailableOctokit();

    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      await this.updateRateLimit(response);

      if (Array.isArray(response.data)) {
        // Directory listing
        return response.data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          sha: item.sha,
          url: item.url,
          html_url: item.html_url,
          download_url: item.download_url,
        }));
      } else {
        // Single file
        const content = response.data as any;
        return {
          name: content.name,
          path: content.path,
          type: content.type,
          size: content.size,
          sha: content.sha,
          content:
            content.encoding === 'base64'
              ? Buffer.from(content.content, 'base64').toString('utf-8')
              : content.content,
          encoding: content.encoding,
          url: content.url,
          html_url: content.html_url,
          download_url: content.download_url,
        };
      }
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Content not found: ${owner}/${repo}/${path}`);
      }
      throw error;
    }
  }

  async listRepositories(owner: string, type: string = 'all', tokens?: string) {
    if (tokens) {
      this.initializeTokensFromString(tokens);
    }
    const octokit = await this.getAvailableOctokit();

    try {
      const response = await octokit.rest.repos.listForOrg({
        org: owner,
        type: type as 'all' | 'public' | 'private' | 'forks' | 'sources' | 'member',
        per_page: 100,
      });

      await this.updateRateLimit(response);

      return response.data.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        ssh_url: repo.ssh_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        created_at: repo.created_at,
      }));
    } catch (error: any) {
      // Try as user repositories if org fails
      try {
        const userResponse = await octokit.rest.repos.listForUser({
          username: owner,
          type: type as 'all' | 'owner' | 'member',
          per_page: 100,
        });

        await this.updateRateLimit(userResponse);

        return userResponse.data.map(repo => ({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          html_url: repo.html_url,
          clone_url: repo.clone_url,
          ssh_url: repo.ssh_url,
          language: repo.language,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          updated_at: repo.updated_at,
          created_at: repo.created_at,
        }));
      } catch (userError: any) {
        if (error.status === 404) {
          throw new Error(`Organization or user ${owner} not found`);
        }
        throw error;
      }
    }
  }

  getRateLimitStatus() {
    return this.tokens.map((token, index) => ({
      index,
      remaining: token.rateLimitRemaining,
      resetTime: new Date(token.rateLimitReset),
      isActive: index === this.currentTokenIndex,
    }));
  }
}
