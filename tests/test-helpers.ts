import { GitRepoHelper } from './git-repo-helper';

/**
 * Higher-order function that provides a fresh GitRepoHelper to test functions
 */
export function withRepo<T = void>(
  testFn: (repo: GitRepoHelper) => Promise<T> | T,
): () => Promise<T> {
  return async () => {
    const repo = new GitRepoHelper();
    // console.debug(`Using repo: ${repo.repoPath}`);

    try {
      repo.initRepo();
      return await testFn(repo);
    } finally {
      repo.cleanup();
    }
  };
}

/**
 * Variant that allows custom repo configuration
 */
export function withCustomRepo<T = void>(
  repoConfig: { name?: string; skipInit?: boolean },
  testFn: (repo: GitRepoHelper) => Promise<T> | T,
): () => Promise<T> {
  return async () => {
    const repo = new GitRepoHelper(repoConfig.name);

    try {
      if (!repoConfig.skipInit) {
        repo.initRepo();
      }
      return await testFn(repo);
    } finally {
      repo.cleanup();
    }
  };
}
