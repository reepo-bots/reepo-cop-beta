import GHUser from './model_ghUser';

export default interface GHPRComment {
  url?: string;
  html_url?: string;
  issue_url?: string;
  id?: number;
  node_id?: string;
  user?: GHUser;
  created_at?: Date;
  updated_at?: Date;
  author_association?: string;
  body?: string;
  performed_via_github_app?: null;
}
