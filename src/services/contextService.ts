import { Context, WebhookPayloadWithRepository } from 'probot';
import GHRelease from '../model/model_ghRelease';
import GHIssue from '../model/model_ghIssue';
import GHLabel from '../model/model_ghLabel';
import GHUser from '../model/model_ghUser';
import GHPr from '../model/model_ghPR';

const CODE_REST_REQUEST_SUCCESS: number = 200;
const CODE_REST_POST_SUCCESS: number = 201;

/**
 * Meant to help abbreviate context object type.
 */
export interface HookContext extends Context<WebhookPayloadWithRepository> {}

interface RepoOwnerData {
  owner: string;
  repo: string;
}

/**
 * A Service that helps manipulate HookContext objects on Runtime
 * to get relevant data / functions that can perform actions using
 * HookContext.
 */
export default class ContextService {
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
  public getPRCommenter(
    context: HookContext,
    pr: GHPr = this.extractPullRequestFromHook(context)
  ): (comment: string) => Promise<boolean> {
    // This works because Github treats both PRs and Issues as 'Github Issues'
    // in this case.
    return this.getGHIssueCommentCreator(context, pr);
  }

  /**
   * Returns a function that can update a Release's text body
   * given an input string.
   * @param context - Object returned from Probot's EventHook.
   * @returns an async function that takes a string and uses that
   * to replace an input Release's body (taken from context).
   */
  public getReleaseBodyUpdater(
    context: HookContext
  ): (currentRelease: GHRelease, newReleaseBody: string) => Promise<boolean> {
    return async (currentRelease: GHRelease, newReleaseBody: string) => {
      const { status }: { status: number } = await context.octokit.rest.repos.updateRelease({
        ...this.getRepoOwnerData(context),
        release_id: currentRelease.id,
        body: newReleaseBody,
      });

      return status === CODE_REST_POST_SUCCESS;
    };
  }

  /**
   * Returns a function that retrieves a filtered list of
   * Pull Requests based on context and specifications.
   * @param context - Object returned from Probot's EventHook.
   * @returns an array of GHPr Objects.
   */
  public getPRRetriever(
    context: HookContext
  ): ({
    pr_per_page,
    pages,
    filter,
    date_range,
  }: {
    pr_per_page?: number;
    pages?: number;
    filter?: 'draft' | 'merged';
    date_range?: { startDate?: Date; endDate?: Date };
  }) => Promise<GHPr[]> {
    return async ({
      pr_per_page,
      pages,
      filter,
      date_range,
    }: {
      pr_per_page?: number;
      pages?: number;
      filter?: 'draft' | 'merged';
      date_range?: { startDate?: Date; endDate?: Date };
    }) => {
      try {
        // Fetched Data De-Construction
        const { data, status }: { data: any[] | GHPr[]; status: number } = await context.octokit.rest.pulls.list({
          ...this.getRepoOwnerData(context),
          state: 'all',
          per_page: pr_per_page ? 50 : pr_per_page, // * DEFAULT: 50
          page: pages ? 1 : pages, // * DEFAULT: 1
        });

        // ! If fetch failed.
        if (status !== CODE_REST_REQUEST_SUCCESS) {
          return [];
        }

        // * Sub-Function used to ensure that submitted Date-Time Strings
        // * fall within the user specified range (if one is provided.)
        const isPRTimeConstraintMet: (...comparisonTimeStrings: string[]) => boolean = (
          ...comparisonTimeStrings: string[]
        ) => {
          // If no Date-Range is provided or no params
          // are provided then time constraint is always met.
          if (!date_range) {
            return true;
          }

          const rangeStart: number = (date_range.startDate ? date_range.startDate : new Date(1)).getTime();
          const rangeEnd: number = (date_range.endDate ? date_range.endDate : new Date()).getTime();
          const comparisonTimes: number[] = comparisonTimeStrings.map((comparisonTimeString: string) =>
            new Date(comparisonTimeString).getTime()
          );

          return comparisonTimes.some((time: number | null) => {
            if (!time) {
              return true;
            }
            return time >= rangeStart && time <= rangeEnd;
          });
        };

        switch (filter) {
          case 'draft':
            return data.filter((pr: GHPr) => pr.draft && isPRTimeConstraintMet(pr.updated_at));
          case 'merged':
            return data.filter((pr: GHPr) => pr.merged_at && isPRTimeConstraintMet(pr.merged_at));
          default:
            return data as GHPr[];
          // TODO: Add support for closed PRs
        }
      } catch (e: any) {
        return [];
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
  public getIssueCommentCreator(
    context: HookContext,
    issue: GHIssue = this.extractIssueFromHook(context)
  ): (comment: string) => Promise<boolean> {
    return this.getGHIssueCommentCreator(context, issue);
  }

  /**
   * Returns an function that creates comments on a `Github Issue`.
   * @param context - Object returned from Probot's EventHook.
   * @param issue - Objects that Github classifies as 'Issues'
   * @returns an async function that adds a comment on a 'Github Issue' and
   * resolves to true if commenting was successful and false otherwise.
   */
  private getGHIssueCommentCreator(context: HookContext, issue: GHIssue | GHPr): (comment: string) => Promise<boolean> {
    return async (comment: string) =>
      (
        await context.octokit.issues.createComment({
          ...this.getRepoOwnerData(context),
          issue_number: issue.number,
          body: comment,
        })
      ).status === CODE_REST_POST_SUCCESS;
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
        const { data, status }: { data: GHLabel[], status: number } = await context.octokit.issues.listLabelsForRepo({ ...this.getRepoOwnerData(context) });
      
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
      try {
        const { status }: { data: any; status: number } = await context.octokit.rest.issues.createLabel({
          ...this.getRepoOwnerData(context),
          name: name,
          description: desc,
          color: color,
        });
        return status === CODE_REST_POST_SUCCESS;
      } catch (e: any) {
        return false;
      }
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
   * @returns GHPr Object containing data about pull request in
   * context.
   */
  public extractPullRequestFromHook(context: HookContext): GHPr {
    return context.payload?.pull_request as GHPr;
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
