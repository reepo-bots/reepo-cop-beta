import GHUser from "./model_ghUser";

export default interface GHMilestone {
  url?: string,
  number?: number,
  title?: string,
  description?: string | null,
  creator?: GHUser | null,
  open_issues?: number,
  closed_issues?: number,
  state?: string,
  created_at?: string,
  updated_at?: string,
  due_on?: string | null,
  closed_at?: string | null
}
