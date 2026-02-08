
export enum AgentAction {
  CreatePost = 'CreatePost',
  CreateComment = 'CreateComment',
  InitializeAgent = 'InitializeAgent',
  UpdateProfile = 'UpdateProfile'
}

export interface AgentPersona {
  name: string;
  bio: string;
  interests: string[];
  tone: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'request';
  message: string;
  details?: any;
}

export interface MoltbookPost {
  content: string;
  imageUrl?: string;
}

export interface MoltbookProfile {
  name: string;
  bio: string;
  avatar?: string;
}
