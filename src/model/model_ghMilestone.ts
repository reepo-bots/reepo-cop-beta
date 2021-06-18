import GHUser from "./model_ghUser";

export default interface GHMilestone {
  url: string,
  number: number,
  title: string,
  description: '',
  creator: GHUser,
  open_issues: number,
  closed_issues: number,
  state: string,
  created_at: string,
  updated_at: string,
  due_on: string,
  closed_at: string
}
