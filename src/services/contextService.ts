import { Context, WebhookPayloadWithRepository } from 'probot';
import GHRelease from '../model/model_ghRelease';
import GHIssue from '../model/model_ghIssue';
import GHLabel from '../model/model_ghLabel';
import GHUser from '../model/model_ghUser';
import GHPr, { GHPrHandler } from '../model/model_ghPR';
import GithubService, { RepoOwnerData } from './githubService';
import { LabelCollectionType } from '../model/model_labelCollection';
import { ChangelogType } from '../model/model_label_type';

const CODE_REST_REQUEST_SUCCESS: number = 200;

// PR Retrieval Function Params (Stored here for abbreviation)
export type PRRetrievalParams = {
  pr_per_page?: number;
  pages?: number;
  filter?: 'draft' | 'merged' | 'changelog-able';
  date_range?: { startDate?: Date; endDate?: Date };
  author?: string;
};

/**
 * Meant to help abbreviate context object type.
 */
export interface HookContext extends Context<WebhookPayloadWithRepository> {}

/**
 * A Service that helps manipulate HookContext objects on Runtime
 * to get relevant data / functions that can perform actions using
 * HookContext.
 */
export default class ContextService {
  private readonly _githubService: GithubService = new GithubService();

  /**
   * Returns an object that contains owner and repo information.
   * @param context - Object returned from Probot's EventHook.
   * @returns object containing owner and repository information.
   */
  private getRepoOwnerData(context: HookContext): RepoOwnerData {
    return context.repo();
  }

  /**
   * Returns a function that creates a comment on a PR.
   * @param context - Object returned from Probot's EventHook.
   * @param pr - GHPr Object retrieved from context.
   * @returns an async function that adds a comment to a PR and resolves
   * to true if commenting was successful and false otherwise.
   */
  public getPRCommenter(context: HookContext): (pr: GHPr, comment: string) => Promise<boolean> {
    // This works because Github treats both PRs and Issues as 'Github Issues'
    // in this case.
    return async (pr: GHPr, comment: string) =>
      await this._githubService.createIssueComment(context.octokit, this.getRepoOwnerData(context), pr, comment);
  }

  /**
   * Returns a function that can update release.
   * @param context - Object returned from Probot's EventHook.
   * @returns an async function that takes an updated release and
   * updates the original on Github.
   */
  public getReleaseUpdater(context: HookContext): (updatedRelease: GHRelease) => Promise<boolean> {
    return async (updatedRelease: GHRelease) => {
      return await this._githubService.updateRelease(context.octokit, this.getRepoOwnerData(context), updatedRelease);
    };
  }

  /**
   * Returns a function that retrieves a filtered list of
   * Pull Requests based on context and specifications.
   * @param context - Object returned from Probot's EventHook.
   * @returns an array of GHPr Objects.
   */
  public getPRRetriever(context: HookContext): (prParams: PRRetrievalParams) => Promise<GHPr[]> {
    return async (prParams: PRRetrievalParams) => {
      // Fetched Data De-Construction
      const fetchedPRs: GHPr[] = await this._githubService.fetchPullRequests(
        context.octokit,
        this.getRepoOwnerData(context),
        { pr_per_page: prParams.pr_per_page, pages: prParams.pages }
      );

      switch (prParams.filter) {
        case 'draft':
          return fetchedPRs.filter(
            (pr: GHPr) =>
              pr.state === 'open' &&
              pr.draft &&
              GHPrHandler.IsPrWithinDateTimeConstraints(pr, 'updated_at', {
                startDateTime: prParams.date_range?.startDate,
                endDateTime: prParams.date_range?.endDate,
              }) &&
              (prParams.author ? pr.user?.login === prParams.author : true)
          );
        case 'merged':
          return fetchedPRs.filter(
            (pr: GHPr) =>
              pr.state === 'closed' &&
              !!pr.merged_at &&
              GHPrHandler.IsPrWithinDateTimeConstraints(pr, 'merged_at', {
                startDateTime: prParams.date_range?.startDate,
                endDateTime: prParams.date_range?.endDate,
              }) &&
              (prParams.author ? pr.user?.login === prParams.author : true)
          );
        case 'changelog-able':
          return fetchedPRs.filter(
            (pr: GHPr) =>
              pr.state === 'closed' &&
              !!pr.merged_at &&
              GHPrHandler.IsPrWithinDateTimeConstraints(pr, 'merged_at', {
                startDateTime: prParams.date_range?.startDate,
                endDateTime: prParams.date_range?.endDate,
              }) &&
              !GHPrHandler.FindLabelByType(pr, LabelCollectionType.ChangelogCollection, ChangelogType.DoNotList) &&
              (prParams.author ? pr.user?.login === prParams.author : true)
          );
        default:
          return fetchedPRs;
        // TODO: Add support for closed PRs
      }
    };
  }

  /**
   * Returns an function that creates comments on an Issue.
   * NOTE: Issue Number is fetched from context object.
   * @param context - Object returned from Probot's EventHook.
   * @returns an async function that adds a comment on an issue and resolves
   * to true if commenting was successful and false otherwise.
   */
  public getIssueCommentCreator(context: HookContext): (issue: GHIssue, comment: string) => Promise<boolean> {
    return async (issue: GHIssue, comment: string) =>
      await this._githubService.createIssueComment(context.octokit, this.getRepoOwnerData(context), issue, comment);
  }

  /**
   * Returns a function that can fetch all labels for given repo.
   * NOTE: Repo data is fetched from context.
   * @param context - Object returned from Probot's EventHook.
   * @returns an async function that fetches Labels from Github.
   */
  public getRepoLabelsRetriever(context: HookContext): () => Promise<GHLabel[]> {
    return async () => {
      try {
        const { data, status }: { data: GHLabel[]; status: number } = await context.octokit.issues.listLabelsForRepo({
          ...this.getRepoOwnerData(context),
        });

        if (status !== CODE_REST_REQUEST_SUCCESS) {
          return [];
        }

        return data;
      } catch (e: any) {
        return [];
      }
    };
  }

  /**
   * Returns a function that creates labels from specified
   * information.
   * @param context - Object returned from Probot's EventHook.
   * @returns an async function that creates labels on Github which
   * promises true if label creation is successful.
   */
  public getLabelCreator(context: HookContext): (name: string, desc: string, color: string) => Promise<boolean> {
    return async (name: string, desc: string, color: string) => {
      return await this._githubService.createLabel(context.octokit, this.getRepoOwnerData(context), {
        name: name,
        description: desc,
        color: color,
      } as GHLabel);
    };
  }

  /**
   * Returns a function that fetches issues that are authored by
   * a specific user.
   * @param context - Object returned from Probot's EventHook.
   * @returns an async function that retrieves author specific issues.
   */
  public getAuthorsIssuesRetriever(context: HookContext): (author: string) => Promise<GHIssue[] | undefined> {
    return async (author: string) => {
      try {
        const rest_result = await context.octokit.issues.listForRepo({
          ...this.getRepoOwnerData(context),
          creator: author,
        });
        return rest_result.status === CODE_REST_REQUEST_SUCCESS ? (rest_result.data as GHIssue[]) : undefined;
      } catch (e: any) {
        return undefined;
      }
    };
  }

  /**
   * Returns a function that replaces a specified label's properties
   * with newly input data on Github.
   * @param context - Object returned from Probot's EventHook.
   * @returns an async function that updates labels on Github and promises true
   * if update was a success.
   */
  public getLabelUpdater(
    context: HookContext
  ): (oldName: string, newName: string, desc: string, color: string) => Promise<boolean> {
    return async (oldName: string, newName: string, desc: string, color: string) => {
      try {
        const { status }: { status: number } = await context.octokit.rest.issues.updateLabel({
          ...this.getRepoOwnerData(context),
          name: oldName,
          new_name: newName,
          description: desc,
          color: color,
        });
        return status === CODE_REST_REQUEST_SUCCESS;
      } catch (e: any) {
        return false;
      }
    };
  }

  /**
   * Returns a function that with relevant inputs,
   * removes specified labels from a Issue and replaces them
   * with a different set of specified labels.
   * @param context - Object returned from Probot's EventHook.
   * @param issueNumber - Number of Issue that is to have its labels replaced.
   * @returns an async function to replace labels on an issue.
   */
  public getAspectLabelReplacer(
    context: HookContext,
    issueNumber?: number
  ): (removalLabelName: string[], replacementLabelNames: string[]) => Promise<boolean> {
    return async (removalLabelName: string[], replacementLabelNames: string[]) => {
      const repoOwnerData: RepoOwnerData = this.getRepoOwnerData(context);
      const labelRemovalResults: boolean[] = [true];

      for (const removalName of removalLabelName) {
        const removalResult: boolean =
          (
            await context.octokit.rest.issues.removeLabel({
              ...repoOwnerData,
              issue_number: issueNumber ? issueNumber : context.payload.issue?.number!,
              name: removalName,
            })
          ).status === CODE_REST_REQUEST_SUCCESS;

        if (!removalResult) {
          console.log(`Error in removing Label: ${removalName} from Issue: ${issueNumber}`);
        }

        labelRemovalResults.push(removalResult);
      }

      const labelAdditionResult: boolean =
        replacementLabelNames && replacementLabelNames.length
          ? (
              await context.octokit.rest.issues.addLabels({
                ...repoOwnerData,
                issue_number: issueNumber ? issueNumber : context.payload.issue?.number!,
                labels: replacementLabelNames,
              })
            ).status === CODE_REST_REQUEST_SUCCESS
          : true;

      if (!labelAdditionResult) {
        console.log(`Error in adding labels to Issue: ${issueNumber}`);
      }

      return (
        labelRemovalResults.reduce((previousValue: boolean, currentValue: boolean) => previousValue && currentValue) &&
        labelAdditionResult
      );
    };
  }

  public getLastReleaseRetriever(
    context: HookContext,
    type: 'draft' | 'published'
  ): () => Promise<GHRelease | undefined> {
    return async () => {
      const { data, status }: { data: GHRelease[] | any[]; status: number } = await context.octokit.repos.listReleases({
        ...this.getRepoOwnerData(context),
      });

      if (status !== CODE_REST_REQUEST_SUCCESS) {
        return undefined;
      }

      return data
        .filter((release: GHRelease) =>
          type === 'draft' ? release.draft && !release.published_at : !release.draft && release.published_at
        )
        .sort(
          (releaseA: GHRelease, releaseB: GHRelease) =>
            new Date(releaseA.published_at!).getTime() - new Date(releaseB.published_at!).getTime()
        )
        .pop();
    };
  }

  public getIssueRetriever(context: HookContext): (issueNumber: number) => Promise<GHIssue | undefined> {
    return async (issueNumber: number) => {
      const { data, status }: { data: any; status: number } = await context.octokit.rest.issues.get({
        ...this.getRepoOwnerData(context),
        issue_number: issueNumber,
      });

      if (status !== CODE_REST_REQUEST_SUCCESS) {
        return undefined;
      }

      return data as GHIssue;
    };
  }

  /**
   * Returns a function that with relevant inputs,
   * removes specified labels from a PR and replaces them
   * with a different set of specified labels.
   * @param context - Object returned from Probot's EventHook.
   * @param pullRequestNumber - Number of PR that is to have its labels replaced.
   * @returns an async function to replace labels on an issue.
   */
  public getPRLabelReplacer(
    context: HookContext,
    pullRequestNumber?: number
  ): (removalLabelName: string[], replacementLabelNames: string[]) => Promise<boolean> {
    // According to Github, for this case Issues and PRs are treated the same.
    return this.getAspectLabelReplacer(
      context,
      pullRequestNumber ? pullRequestNumber : context.payload.pull_request?.number!
    );
  }

  /**
   * Retrieves labels from context PR.
   * @param context - Object returned from Probot's EventHook.
   * @returns GHLabel[] containing all labels on context specified PR.
   */
  public extractLabelsFromPRHook(context: HookContext): GHLabel[] {
    return context.payload.pull_request?.labels;
  }

  /**
   * Retrieves issue bound to context.
   * @param context - Object returned from Probot's EventHook.
   * @returns GHIssue from context.
   */
  public extractIssueFromHook(context: HookContext): GHIssue {
    return context.payload.issue as GHIssue;
  }

  /**
   * Returns the nested Pull Request data from context.
   * @param context - Object returned from Probot's EventHook.
   * @returns Promise of GHPr Object containing data about pull request in
   * context.
   */
  public async extractPullRequestFromHook(context: HookContext): Promise<GHPr | undefined> {
    const pr: GHPr | undefined = context.payload?.pull_request as GHPr;

    if (!pr) {
      return pr;
    }

    if (!(await this._githubService.updatePRComments(pr))) {
      console.error('Failed to update PR Comments');
    }

    return pr;
  }

  /**
   * Retrieves the Author of the Issue in context.
   * @param context - Object returned from Probot's EventHook.
   * @returns GHUser author of Issue in context.
   */
  public extractUserFromIssueHook(context: HookContext): GHUser {
    return this.extractIssueFromHook(context)?.user as GHUser;
  }

  /**
   * Retrieves the Release from context.
   * @param context - Object returned from Probot's EventHook.
   */
  public extractReleaseFromHook(context: HookContext): GHRelease {
    return context.payload?.release as GHRelease;
  }
}
