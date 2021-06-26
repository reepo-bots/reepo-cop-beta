import { ProbotOctokit } from 'probot';
import GHIssue from '../model/model_ghIssue';
import GHLabel from '../model/model_ghLabel';
import GHPr from '../model/model_ghPR';
import GHRelease from '../model/model_ghRelease';
import fetch from 'node-fetch';

type Octokit = InstanceType<typeof ProbotOctokit>;
export type RepoOwnerData = {
  owner: string;
  repo: string;
};
export type GithubApiRequirements = {
  octokit: Octokit;
  repoOwnerData: RepoOwnerData;
};

export default class GithubService {
  private readonly STATUS_OK: number = 200;
  private readonly STATUS_CREATED: number = 201;
  private readonly STATUS_FAILED: number = -1; // TODO: Replace Custom Error Code Usage

  /**
   * Creates a comment on a Github Issue / Pull Request
   * @param octokit - Github API TS Client
   * @param repoOwnerData - Repository Data
   * @param issue - GHPr Or GHIssue object where comment is to be posted
   * @param commentBody - Message body of comment
   * @returns A promise of true if comment was successfully created,
   * false otherwise
   */
  public async createIssueComment(
    octokit: Octokit,
    repoOwnerData: RepoOwnerData,
    issue: GHIssue | GHPr,
    commentBody: string
  ) {
    try {
      const { status }: { status: number } = await octokit.issues
        .createComment({
          ...repoOwnerData,
          issue_number: issue.number,
          body: commentBody,
        })
        .catch(() => {
          return { status: this.STATUS_FAILED };
        });

      return status === this.STATUS_CREATED;
    } catch (err: any) {
      return false;
    }
  }

  /**
   * Updates a Pull Request's (@type GHPr) list of comments.
   * @param pr - Pull Request (@type GHPr) to fetch comments from.
   * @returns A Promise of true if the Pull Request could update its
   * list of comments.
   */
  public async updatePRComments(pr: GHPr): Promise<boolean> {
    try {
      if (!pr.comments_url) {
        return true;
      }
      const data = await fetch(pr.comments_url);
      pr.comments = data.status === this.STATUS_OK ? await data.json() : [];

      return data.status === this.STATUS_OK;
    } catch (err: any) {
      return false;
    }
  }

  /**
   * Creates a function on Github Repo
   * @param octokit - Github API TS Client
   * @param repoOwnerData - Repository Data
   * @param ghLabel - Label to be created
   * @returns A promise of true if label creation is successful, false otherwise
   */
  public async createLabel(octokit: Octokit, repoOwnerData: RepoOwnerData, ghLabel: GHLabel): Promise<boolean> {
    try {
      const { status }: { status: number } = await octokit.rest.issues
        .createLabel({
          ...repoOwnerData,
          name: ghLabel.name!,
          description: ghLabel.description!,
          color: ghLabel.color,
        })
        .catch(() => {
          return { status: this.STATUS_FAILED };
        });

      return status === this.STATUS_CREATED;
    } catch (err: any) {
      return false;
    }
  }

  /**
   * Fetches Pull Requests based on filters from Github
   * @param octokit - Github API TS Client
   * @param repoOwnerData - Repository Data
   * @param filterData - PR Filtering data
   * @returns A promise resolving to an array of GHPr(s) if fetch was succesful,
   * resolves to an empty array otherwise
   */
  public async fetchPullRequests(
    octokit: Octokit,
    repoOwnerData: RepoOwnerData,
    filterData: { pr_per_page?: number; pages?: number }
  ): Promise<GHPr[]> {
    try {
      const { data, status }: { data: GHPr[]; status: number } = await octokit.rest.pulls
        .list({
          ...repoOwnerData,
          state: 'all',
          per_page: filterData.pr_per_page ? 50 : filterData.pr_per_page, // * DEFAULT: 50
          page: filterData.pages ? 1 : filterData.pages, // * DEFAULT: 1
        })
        .catch(() => {
          return { data: [], status: this.STATUS_FAILED };
        });

      if (status !== this.STATUS_OK) {
        return [];
      }

      return data;
    } catch (err: any) {
      return [];
    }
  }

  /**
   * Updates a Release on Github
   * @param octokit - Github API TS Client
   * @param repoOwnerData - Repository Data
   * @param updatedRelease - GHRelease Object that is to be used
   * to update Release on Github.
   * @returns A promise resolving to true if the update was successful, false
   * otherwise.
   */
  public async updateRelease(
    octokit: Octokit,
    repoOwnerData: RepoOwnerData,
    updatedRelease: GHRelease
  ): Promise<boolean> {
    try {
      const { status }: { status: number } = await octokit.rest.repos
        .updateRelease({
          ...repoOwnerData,
          ...updatedRelease,
        })
        .catch(() => {
          return { status: this.STATUS_FAILED };
        });

      return status === this.STATUS_CREATED;
    } catch (err: any) {
      return false;
    }
  }
}
