import GHUser from './model_ghUser';

export default interface GHRelease {
  url: string,
  id: number,
  author: GHUser,
  tag_name: string,
  target_commitish: string, // Branch that is used for release.
  name: string,
  draft: boolean,
  prerelease: boolean,
  created_at: string,
  published_at: string | null,
  body: string
}
