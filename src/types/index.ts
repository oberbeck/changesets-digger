export interface ChangelogEntry {
  version: string;
  date: string;
  changes: ChangeEntry[];
  isUpcoming?: boolean;
}

export interface ChangeEntry {
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  summary: string;
}

export interface ChangelogIndex {
  versions: VersionInfo[];
  latestVersion: string;
}

export interface VersionInfo {
  version: string;
  date: string;
  fileUrl: string;
  summary: string;
}

export interface DiggerConfig {
  outputDir?: string;
  maxVersions?: number;
  categoryTitles?: Record<string, string>;
}

export interface ChangesetData {
  id: string;
  summary: string;
  releases: Array<{
    type: 'major' | 'minor' | 'patch';
  }>;
}
