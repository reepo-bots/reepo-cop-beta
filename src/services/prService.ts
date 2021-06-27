import GHLabel from '../model/model_ghLabel';
import LabelService from './labelService';
import { LabelCollectionType } from '../model/model_labelCollection';
import { LABEL_ARCHIVE } from '../constants/const_labels';
import { PRAction } from '../model/model_pr';
import { PRType } from '../model/model_label_type';
import GHPr, { GHPrHandler } from '../model/model_ghPR';
import Label from '../model/model_label';
import GHIssue, { GHIssueHandler } from '../model/model_ghIssue';
import GHPRComment from '../model/model_ghPrComment';
import { GHUserHandler } from '../model/model_ghUser';
import * as packageJson from '../../package.json';

export default class PRService {
  private readonly COMMIT_MESSAGE_VALIDATION_TITLE = '<h3 align="center">Commit Message Validation</h3>\n\n';

  /**
   * Replaces existing PR Labels with new labels based on the PR Action.
   * @param labelReplacer - A function that removes a set of labels and adds another to a PR.
   * @param existingLabels - Existing set of Labels on said PR.
   * @param prAction - Type of action taking place on said PR.
   */
  public replaceExistingPRLabels(
    labelReplacer: (removalLabelName: string[], replacementLabelNames: string[]) => Promise<boolean>,
    existingLabels: GHLabel[],
    prAction: PRAction,
    pr: GHPr
  ): Promise<boolean> {
    const labelNamesToRemove: string[] = LabelService.extractLabelNames(
      LabelCollectionType.PRCollection,
      existingLabels
    );
    const labelNamesToAdd: string[] = [];
    switch (prAction) {
      case PRAction.READY_FOR_REVIEW:
        labelNamesToAdd.push(LABEL_ARCHIVE.getLabel(LabelCollectionType.PRCollection, PRType.ToReview)?.name!);
      case PRAction.OPENED:
        labelNamesToAdd.push(
          LABEL_ARCHIVE.getLabel(LabelCollectionType.PRCollection, pr?.draft ? PRType.OnGoing : PRType.ToReview)?.name!
        );
        break;
      case PRAction.CONVERTED_TO_DRAFT:
        labelNamesToAdd.push(LABEL_ARCHIVE.getLabel(LabelCollectionType.PRCollection, PRType.OnGoing)?.name!);
        break;
    }

    return labelReplacer(labelNamesToRemove, labelNamesToAdd);
  }

  private getAspectLabellingPriority(firstLineOfBody?: string): 'Linked-Issue' | 'Manual' | null {
    return firstLineOfBody
      ? firstLineOfBody.includes(`Type:`)
        ? 'Manual'
        : firstLineOfBody.includes(`Fixes`)
        ? 'Linked-Issue'
        : null
      : null;
  }

  private fetchManualAspectLabelName(firstLineOfBody: string): string {
    const typeClassificationRegex: RegExp = /Type: (.*)/g;
    const extractedTypeArray: RegExpExecArray | null = typeClassificationRegex.exec(firstLineOfBody);

    if (!extractedTypeArray) {
      return '';
    }

    const [_input, extractedTypeLabelName, ..._] = extractedTypeArray;
    const prIssueTypeLabel: Label | undefined = LABEL_ARCHIVE.collatePresetLabels(
      LabelCollectionType.AspectCollection,
      LabelCollectionType.ChangelogCollection
    ).find((label: Label) => label.name.includes(extractedTypeLabelName));

    if (!prIssueTypeLabel) {
      return '';
    }

    return prIssueTypeLabel.name;
  }

  private async fetchLinkedAspectLabelName(
    firstLineOfBody: string,
    issueRetriever: (issueNumber: number) => Promise<GHIssue | undefined>
  ): Promise<string> {
    const linkedIssueRegex: RegExp = /Fixes #(.*)/g;
    const extractedIssueArray: RegExpExecArray | null = linkedIssueRegex.exec(firstLineOfBody);

    if (!extractedIssueArray) {
      return '';
    }

    const [_inputStr, extractedIssueNumber, ..._] = extractedIssueArray;
    const linkedIssue: GHIssue | undefined = await issueRetriever(+extractedIssueNumber);

    if (!linkedIssue) {
      return '';
    }

    const aspectLabel: GHLabel | undefined = GHIssueHandler.FindLabelByType(
      linkedIssue,
      LabelCollectionType.AspectCollection
    );

    if (!aspectLabel) {
      return '';
    }

    return aspectLabel.name!;
  }

  /**
   *
   * @param ghPr - Github PR Model Object.
   * @param prLabelReplacer - Function that removes and replaces a set of labels
   * with a newly specified set.
   * @returns a promise of true if Issue Label assignment was successful false otherwise.
   */
  public async assignAspectLabel(
    ghPr: GHPr,
    prLabelReplacer: (removalLabelName: string[], replacementLabelNames: string[]) => Promise<boolean>,
    issueRetriever: (issueNumber: number) => Promise<GHIssue | undefined>
  ): Promise<boolean> {
    if (ghPr?.draft || !ghPr.body) {
      return true;
    }

    const firstLineOfBody: string | undefined = ghPr.body.split('\n')[0];
    const labellingPriority: 'Linked-Issue' | 'Manual' | null = this.getAspectLabellingPriority(firstLineOfBody);
    const existingAspectLabel: GHLabel | undefined = GHPrHandler.FindLabelByType(
      ghPr,
      LabelCollectionType.AspectCollection
    );

    if (!labellingPriority) {
      return true;
    }

    switch (labellingPriority) {
      case 'Manual':
        const manualLabelName: string = this.fetchManualAspectLabelName(firstLineOfBody);

        // Do not perform a replacement if labels are same
        if (existingAspectLabel?.name! === manualLabelName) {
          return true;
        }

        return prLabelReplacer([existingAspectLabel?.name!], manualLabelName ? [manualLabelName] : []);
      case 'Linked-Issue':
        const linkedLabelName: string = await this.fetchLinkedAspectLabelName(firstLineOfBody, issueRetriever);

        // Do not perform a replacement if labels are same
        if (existingAspectLabel?.name! === linkedLabelName) {
          return true;
        }

        return await prLabelReplacer([existingAspectLabel?.name!], linkedLabelName ? [linkedLabelName] : []);
      default:
        return true;
    }
  }

  /**
   * Validates and posts result of validation directly on PR in Github.
   * @param ghPr - Github PR Model Object.
   * @param prCommenter - Async function that makes a comment on a PR given an input string.
   * @returns a promise that resolves to true if validation process was a success, false
   * otherwise.
   */
  public async validatePRCommitMessageProposal(
    ghPr: GHPr,
    prCommenter: (pr: GHPr, comment: string) => Promise<boolean>
  ): Promise<boolean> {
    // Do not check if PR is still in draft.
    if (ghPr?.draft || !ghPr.body) {
      return true;
    }

    const prCommitMessageRegex: RegExp = /Commit Message:[\r\n]+```[\r\n](.*)[\r\n]```/gis;
    const extractedMessageArray: RegExpExecArray | null = prCommitMessageRegex.exec(ghPr.body);

    // Do not check if PR does not contain commit message
    // proposal.
    if (!extractedMessageArray) {
      return true;
    }

    const extractedMessage: string = extractedMessageArray[1].trim();

    const commitMessageCheckRegex: RegExp = /.*```(.*)```.*/gs;
    const lastCommitCheckComment: GHPRComment | undefined = ghPr.comments
      ?.filter((comment: GHPRComment) => {
        return (
          comment.user?.type === GHUserHandler.USER_TYPE_BOT &&
          comment.user?.login?.includes(packageJson.name) &&
          comment?.body?.includes(this.COMMIT_MESSAGE_VALIDATION_TITLE)
        );
      })
      .sort((a: GHPRComment, b: GHPRComment) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())
      .pop();
    const lastCommitCheckBody: string | undefined = lastCommitCheckComment?.body
      ? lastCommitCheckComment?.body
      : undefined;

    if (lastCommitCheckBody) {
      const extractedPreviousMessageArray: RegExpExecArray | null = commitMessageCheckRegex.exec(lastCommitCheckBody!);

      // Do not proceed with check if previously crafted
      // verification does not exist.
      if (extractedPreviousMessageArray) {
        const extractedPreviousMessage: string = extractedPreviousMessageArray![1].trim();

        if (extractedMessage === extractedPreviousMessage) {
          return true;
        }
      }
    }

    const commitMsgCorrectionMsg: string = this.getCommitMessageCorrectionMessage(extractedMessage);
    return await prCommenter(ghPr, commitMsgCorrectionMsg);
  }

  /**
   * Validates commit messages and returns a validation result
   * string.
   * @param commitMsg - Proposed Commit message on PR.
   * @returns string containing validation results.
   */
  private getCommitMessageCorrectionMessage(commitMsg: string): string {
    const VALIDATION_TITLE = '<h3 align="center">Commit Message Validation</h3>\n\n';
    const QUOTED_COMMIT_MSG = `\`\`\`\n${commitMsg}\n\`\`\`\n`;
    const splitMsg: string[] = commitMsg.split('\n');

    const validateTitleNoPeriod: (splitMsg: string[]) => string = (splitMsg: string[]) => {
      const CORRECTION_TITLE_SUCCESS: string = `### ✔️ Commit message title does not end with a period.\n`;
      const CORRECTION_TITLE_FAIL: string = `### ❌ Commit message title ends with a Period.\n`;
      if (splitMsg.length >= 1) {
        return splitMsg[0][splitMsg[0].length - 1] === '.' ? CORRECTION_TITLE_FAIL : CORRECTION_TITLE_SUCCESS;
      }

      return '';
    };

    // Ensures every line adheres to a 72 Char Limit.
    const validateCharCheck: (splitMsg: string[]) => string = (splitMsg: string[]) => {
      const MAX_LINE_LEN: number = 72;
      const CORRECTION_TITLE_SUCCESS: string = `### ✔️ All lines adhere to ${MAX_LINE_LEN} char limit.\n`;
      const CORRECTION_TITLE_FAIL: string = `### ❌ The following lines do not adhere to a ${MAX_LINE_LEN} char limit.`;
      const corrections: string[] = [];
      splitMsg.forEach((msgLine: string) => {
        if (msgLine.length > MAX_LINE_LEN) {
          corrections.push(`\n- ${msgLine} || Len = ${msgLine.length}.`);
        }
      });

      // Combines all correction messages if any exist.
      return corrections.length === 0
        ? CORRECTION_TITLE_SUCCESS
        : `${CORRECTION_TITLE_FAIL}${corrections.reduce(
            (previousCorrection: string, currentCorrection: string) => `${previousCorrection}${currentCorrection}`
          )}\n`;
    };

    // Ensures there is a space between a title and body (if applicable).
    const validateSpaceBetweenTitleAndBody: (splitMsg: string[]) => string = (splitMsg: string[]) => {
      const CORRECTION_TITLE_SUCCESS: string = `### ✔️ Commit message contains blank line between Title and Body.\n`;
      const CORRECTION_TITLE_FAIL: string = '### ❌ Commit message is missing a blank line between Title and Body.\n';

      if (splitMsg.length > 1) {
        if (splitMsg[1].trim() !== '') {
          return CORRECTION_TITLE_FAIL;
        } else {
          return CORRECTION_TITLE_SUCCESS;
        }
      } else {
        return '';
      }
    };

    return `${VALIDATION_TITLE}${QUOTED_COMMIT_MSG}${validateTitleNoPeriod(splitMsg)}${validateCharCheck(
      splitMsg
    )}${validateSpaceBetweenTitleAndBody(splitMsg)}`;
  }
}
