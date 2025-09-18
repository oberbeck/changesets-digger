import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class GitRepoHelper {
  readonly repoPath: string;
  private originalCwd: string;

  constructor(baseRepoName = 'test-repo') {
    this.originalCwd = process.cwd();
    const uniqueId = randomUUID().slice(0, 8); // Use first 8 chars for readability
    const uniqueRepoName = `${baseRepoName}-${uniqueId}`;
    this.repoPath = path.join(os.tmpdir(), uniqueRepoName);
  }

  /**
   * Initialize a new git repository with basic setup
   */
  initRepo(): void {
    // Clean up if exists
    if (fs.existsSync(this.repoPath)) {
      fs.rmSync(this.repoPath, { recursive: true, force: true });
    }

    // Create directory
    fs.mkdirSync(this.repoPath, { recursive: true });

    // Change to repo directory
    process.chdir(this.repoPath);

    // Initialize git
    this.execInRepo('git init');
    this.execInRepo('git config user.name "Test User"');
    this.execInRepo('git config user.email "test@example.com"');

    // Create initial package.json
    const packageJson = {
      name: 'test-package',
      version: '0.0.0',
      description: 'Test package for changesets-digger',
      private: true,
    };

    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

    // Create initial README
    fs.writeFileSync(
      'README.md',
      '# Test Package\n\nThis is a test package for changesets-digger integration tests.',
    );

    // Initial commit
    this.execInRepo('git add .');
    this.execInRepo('git commit -m "Initial commit"');
  }

  /**
   * Create a changeset using our actual add command (non-interactive)
   */
  createChangeset(
    id: string,
    type: 'major' | 'minor' | 'patch',
    summary: string,
  ): void {
    try {
      // Note: id parameter is ignored since add command generates its own ID
      this.execDiggerCommand(`add --type ${type} --message "${summary}"`);
    } catch (error) {
      throw new Error(`Failed to create changeset: ${error}`);
    }
  }

  /**
   * Create a changeset file manually (for testing edge cases)
   */
  createChangesetFileManually(
    id: string,
    type: 'major' | 'minor' | 'patch',
    summary: string,
  ): void {
    const changesetDir = path.join(this.repoPath, '.changeset');
    if (!fs.existsSync(changesetDir)) {
      fs.mkdirSync(changesetDir, { recursive: true });
    }

    const changesetContent = `---
type: ${type}
---

${summary}
`;

    const changesetPath = path.join(changesetDir, `${id}.md`);
    fs.writeFileSync(changesetPath, changesetContent);
  }

  /**
   * Create a git tag
   */
  createTag(tagName: string, message?: string): void {
    const tagCommand = message
      ? `git tag -a ${tagName} -m "${message}"`
      : `git tag ${tagName}`;

    this.execInRepo(tagCommand);
  }

  /**
   * Make some file changes and commit them
   */
  makeChangesAndCommit(
    changes: { [filename: string]: string },
    commitMessage: string,
  ): void {
    Object.entries(changes).forEach(([filename, content]) => {
      const filePath = path.join(this.repoPath, filename);
      fs.writeFileSync(filePath, content);
    });

    this.execInRepo('git add .');
    this.execInRepo(`git commit -m "${commitMessage}"`);
  }

  /**
   * Execute a command in the repo directory
   */
  execInRepo(command: string): string {
    return execSync(command, {
      cwd: this.repoPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    })
      .toString()
      .trim();
  }

  /**
   * Execute our CLI command in the repo directory
   */
  execDiggerCommand(command: string): string {
    const diggerPath = path.join(this.originalCwd, 'bin/changesets-digger');
    const fullCommand = `node "${diggerPath}" ${command}`;

    return execSync(fullCommand, {
      cwd: this.repoPath,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
      env: { ...process.env, NODE_PATH: this.originalCwd },
    }).toString();
  }

  /**
   * Get the path to a file in the repo
   */
  getFilePath(filename: string): string {
    return path.join(this.repoPath, filename);
  }

  /**
   * Read a file from the repo
   */
  readFile(filename: string): string {
    return fs.readFileSync(this.getFilePath(filename), 'utf-8');
  }

  /**
   * Check if a file exists in the repo
   */
  fileExists(filename: string): boolean {
    return fs.existsSync(this.getFilePath(filename));
  }

  /**
   * Get the repo path
   */
  getRepoPath(): string {
    return this.repoPath;
  }

  /**
   * Clean up and restore original working directory
   */
  cleanup(): void {
    process.chdir(this.originalCwd);

    if (fs.existsSync(this.repoPath)) {
      fs.rmSync(this.repoPath, { recursive: true, force: true });
    }
  }

  /**
   * Get list of git tags
   */
  getTags(): string[] {
    try {
      const output = this.execInRepo('git tag -l --sort=-version:refname');
      return output ? output.split('\n').filter((tag) => tag.trim()) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get current git commit hash
   */
  getCurrentCommit(): string {
    return this.execInRepo('git rev-parse HEAD');
  }
}
