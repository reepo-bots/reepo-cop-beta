import LabelService from './labelService';
import PRService from './prService';
import ContextService, { HookContext } from './contextService';
import IssueService from './issueService';
import ReleaseService from './releaseService';
import { PRAction } from '../model/model_pr';
import GHRelease from '../model/model_ghRelease';

export default class BotService {
  private _labelService: LabelService;
  private _prService: PRService;
  private _contextService: ContextService;
  private _issueService: IssueService;
  private _releaseService: ReleaseService;

  constructor() {
    this._labelService = new LabelService();
    this._prService = new PRService();
    this._contextService = new ContextService();
    this._issueService = new IssueService();
    this._releaseService = new ReleaseService();
  }

  public async updateDraftRelease(context: HookContext): Promise<boolean> {
    const existingRelease: GHRelease | undefined = await this._contextService.getLastReleaseRetriever(
      context,
      'draft'
    )();

    if (!existingRelease) {
      return true;
    }

    return this._releaseService.updateReleaseChangelog(
      existingRelease,
      this._contextService.getLastReleaseRetriever(context, 'published'),
      this._contextService.getPRRetriever(context),
      this._contextService.getReleaseBodyUpdater(context)
    );
  }

  /**
   * Performs a set of actions on an incoming PR based on its
   * context type.
   * @param context - Context Object provided by Probot.
   * @param prAction - Type of PR context to handle.
   */
  public async handlePR(context: HookContext, prAction: PRAction): Promise<boolean> {
    const prHandlingResults: boolean[] = [];
    await this.handleLabelValidation(context);

    if (prAction === PRAction.EDITED || prAction === PRAction.READY_FOR_REVIEW) {
      prHandlingResults.push(
        await this._prService.validatePRCommitMessageProposal(
          this._contextService.extractPullRequestFromHook(context),
          this._contextService.getPRCommenter(context)
        ),
        await this._prService.assignIssueLabel(
          this._contextService.extractPullRequestFromHook(context),
          this._contextService.getPRLabelReplacer(context)
        )
      );
    }

    if (prAction === PRAction.READY_FOR_REVIEW || prAction === PRAction.CONVERTED_TO_DRAFT) {
      prHandlingResults.push(await this.handlePRLabelReplacement(context, prAction));
    }

    return prHandlingResults.reduce(
      (previousResults: boolean, currentResult: boolean) => previousResults && currentResult
    );
  }

  /**
   * Replaces existing PR Label with new ones depending on the type of action
   * taking place on said PR.
   * @param context - Context Object provided by Probot.
   * @param prAction - PR's Condition (What action to PR triggered this hook.)
   * @returns promise of true if label replacement was successful, false otherwise.
   */
  private async handlePRLabelReplacement(context: HookContext, prAction: PRAction): Promise<boolean> {
    if (!(await this.handleLabelValidation(context))) {
      console.log(this.generateLabelValidationFaliureMessage(`PRLabelReplacement: ${prAction}`));
    }

    return this._prService.replaceExistingPRLabels(
      this._contextService.getPRLabelReplacer(context),
      this._contextService.extractLabelsFromPRHook(context),
      prAction
    );
  }

  /**
   * Crafts and posts a comment of congratulation to a user for achieving a milestone
   * number of items.
   * @param context - Context Object provided by Probot.
   * @param congratulationType - string to check item for congratulation (i.e. PR/Issue).
   * @returns promise of true if message was successfully posted, false otherwise.
   */
  public async handleUserCongratulatoryMessage(
    context: HookContext,
    congratulationType: 'Issue' | 'PR'
  ): Promise<boolean> {
    switch (congratulationType) {
      case 'Issue':
        const userIssueCount: number = await this._issueService.getNumberOfIssuesCreatedByUser(
          this._contextService.extractUserFromIssueHook(context),
          this._contextService.getAuthorsIssuesRetriever(context)
        );
        if (this._issueService.isUsersMilestone(userIssueCount)) {
          const congPostResult: boolean = await this._contextService.getIssueCommentCreator(context)(
            this._issueService.getUserMilestoneIssueCongratulation(userIssueCount)
          );
          if (!congPostResult) {
            console.log('Unable to Post Congratulatory comment on Issue.');
          }
          return congPostResult;
        }
        break;

      case 'PR':
        console.log('PR Congratulation Function - Work In Progress');
        return false;
      default:
        return false;
    }

    return false;
  }

  /**
   * Attempts to auto-label an issue based on keywords present on its title. Performs
   * a label validation on the repo prior to auto-labelling.
   * @param context - Context Object provided by Probot.
   * @returns a promise of true if automated labelling was a success, false otherwise.
   */
  public async handleAutomatedIssueLabelling(context: HookContext): Promise<boolean> {
    if (!(await this.handleLabelValidation(context))) {
      console.log(this.generateLabelValidationFaliureMessage(`AutoIssueLabelling`));
    }

    if (
      !(await this._issueService.performAutomatedLabelling(
        this._contextService.extractIssueFromHook(context),
        this._contextService.getIssueLabelReplacer(context)
      ))
    ) {
      console.log('Automated Issue Lablling has encountered an error.');
      return false;
    }

    return true;
  }

  /**
   * Ensures that all labels are validated prior to any Bot-Actions
   * involving labels.
   * @param context - Context Object provided by Probot.
   * @returns A promise of true if label validation was successful and
   * false otherwise.
   */
  public async handleLabelValidation(context: HookContext): Promise<boolean> {
    return await this._labelService.validateLabelsOnGihtub(
      this._contextService.getRepoLabelsRetriever(context),
      this._contextService.getLabelUpdater(context),
      this._contextService.getLabelCreator(context)
    );
  }

  /**
   * Generates a string based on the location of faliure while
   * using label validation.
   * @param location - string representing faliure location.
   * @returns a string that communicates a faliure in the label
   * validation step.
   */
  private generateLabelValidationFaliureMessage(location: string) {
    return `Label Validation failed in ${location}. Proceed with caution.`;
  }
}
