export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  branch: string | null;
  isHead: boolean;
  parents: string[];
  children: string[];
}

export interface GitInfo {
  branch: string;
  hasChanges: boolean;
  commits: GitCommit[];
  remoteUrl: string | null;
  remoteStatus: {
    ahead: number;
    behind: number;
    isSynced: boolean;
    isAhead: boolean;
    isBehind: boolean;
    isDiverged: boolean;
  } | null;
  localBranches: string[];
  remoteBranches: string[];
}

export interface FileChange {
  file: string;
  status: string;
  statusDesc: string;
  additions?: number;
  deletions?: number;
}

export interface FileTreePanelProps {
  t: (key: string) => string;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  workspacePath?: string | null;
}