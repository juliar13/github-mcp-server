import { GitHubManager } from './github-manager';

// Mock environment variables
process.env.GITHUB_TOKENS = 'mock-token-1,mock-token-2';

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getLatestRelease: jest.fn(),
        getContent: jest.fn(),
        listForOrg: jest.fn(),
        listForUser: jest.fn(),
      },
    },
  })),
}));

describe('GitHubManager', () => {
  let githubManager: GitHubManager;

  beforeEach(() => {
    githubManager = new GitHubManager();
  });

  describe('initialization', () => {
    it('should initialize with multiple tokens', () => {
      const rateLimitStatus = githubManager.getRateLimitStatus();
      expect(rateLimitStatus).toHaveLength(2);
      expect(rateLimitStatus[0].remaining).toBe(5000);
      expect(rateLimitStatus[1].remaining).toBe(5000);
    });

    it('should throw error if no tokens provided', () => {
      delete process.env.GITHUB_TOKENS;
      expect(() => new GitHubManager()).toThrow('GITHUB_TOKENS environment variable is required');
    });
  });

  describe('getLatestRelease', () => {
    it('should return latest release information', async () => {
      const mockRelease = {
        data: {
          tag_name: 'v1.0.0',
          name: 'Release 1.0.0',
          body: 'Initial release',
          published_at: '2023-01-01T00:00:00Z',
          html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
          assets: [
            {
              name: 'binary.zip',
              download_count: 100,
              browser_download_url:
                'https://github.com/owner/repo/releases/download/v1.0.0/binary.zip',
              size: 1024,
            },
          ],
        },
        headers: {
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200',
        },
      };

      const mockOctokit = {
        rest: {
          repos: {
            getLatestRelease: jest.fn().mockResolvedValue(mockRelease),
          },
        },
      };

      // Mock the private method
      (githubManager as any).getAvailableOctokit = jest.fn().mockResolvedValue(mockOctokit);

      const result = await githubManager.getLatestRelease('owner', 'repo');

      expect(result).toEqual({
        tag_name: 'v1.0.0',
        name: 'Release 1.0.0',
        body: 'Initial release',
        published_at: '2023-01-01T00:00:00Z',
        html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
        assets: [
          {
            name: 'binary.zip',
            download_count: 100,
            browser_download_url:
              'https://github.com/owner/repo/releases/download/v1.0.0/binary.zip',
            size: 1024,
          },
        ],
      });
    });

    it('should handle 404 error for non-existent repository', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getLatestRelease: jest.fn().mockRejectedValue({ status: 404 }),
          },
        },
      };

      (githubManager as any).getAvailableOctokit = jest.fn().mockResolvedValue(mockOctokit);

      await expect(githubManager.getLatestRelease('owner', 'nonexistent')).rejects.toThrow(
        'Repository owner/nonexistent not found or no releases available'
      );
    });
  });

  describe('getRepositoryContent', () => {
    it('should return file content', async () => {
      const mockContent = {
        data: {
          name: 'README.md',
          path: 'README.md',
          type: 'file',
          size: 1024,
          sha: 'abc123',
          content: Buffer.from('# Hello World').toString('base64'),
          encoding: 'base64',
          url: 'https://api.github.com/repos/owner/repo/contents/README.md',
          html_url: 'https://github.com/owner/repo/blob/main/README.md',
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/README.md',
        },
        headers: {
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200',
        },
      };

      const mockOctokit = {
        rest: {
          repos: {
            getContent: jest.fn().mockResolvedValue(mockContent),
          },
        },
      };

      (githubManager as any).getAvailableOctokit = jest.fn().mockResolvedValue(mockOctokit);

      const result = await githubManager.getRepositoryContent('owner', 'repo', 'README.md');

      expect(result).toEqual({
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        size: 1024,
        sha: 'abc123',
        content: '# Hello World',
        encoding: 'base64',
        url: 'https://api.github.com/repos/owner/repo/contents/README.md',
        html_url: 'https://github.com/owner/repo/blob/main/README.md',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/README.md',
      });
    });

    it('should return directory listing', async () => {
      const mockDirectory = {
        data: [
          {
            name: 'file1.txt',
            path: 'dir/file1.txt',
            type: 'file',
            size: 512,
            sha: 'def456',
            url: 'https://api.github.com/repos/owner/repo/contents/dir/file1.txt',
            html_url: 'https://github.com/owner/repo/blob/main/dir/file1.txt',
            download_url: 'https://raw.githubusercontent.com/owner/repo/main/dir/file1.txt',
          },
        ],
        headers: {
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200',
        },
      };

      const mockOctokit = {
        rest: {
          repos: {
            getContent: jest.fn().mockResolvedValue(mockDirectory),
          },
        },
      };

      (githubManager as any).getAvailableOctokit = jest.fn().mockResolvedValue(mockOctokit);

      const result = await githubManager.getRepositoryContent('owner', 'repo', 'dir');

      expect(result).toEqual([
        {
          name: 'file1.txt',
          path: 'dir/file1.txt',
          type: 'file',
          size: 512,
          sha: 'def456',
          url: 'https://api.github.com/repos/owner/repo/contents/dir/file1.txt',
          html_url: 'https://github.com/owner/repo/blob/main/dir/file1.txt',
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/dir/file1.txt',
        },
      ]);
    });
  });
});
