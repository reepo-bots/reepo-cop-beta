import GHUser from './model_ghUser';

export default interface GHPr {
  url: string,
  number: number,
  state: string,
  title: string,
  user: GHUser,
  body: string,
  created_at: string,
  updated_at: string,
  closed_at?: string,
  merged_at?: string,
  milestone?: string,
  draft: boolean
}