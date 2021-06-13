import GHLabel from '../model/model_ghLabel';
import LabelService from './labelService';
import { LabelCollectionType } from '../model/model_labelCollection';
import { LABEL_ARCHIVE } from '../constants/const_labels';
import { PRAction } from '../model/model_pr';
import { PRType } from '../model/model_label_type';
import GHPr from '../model/model_ghPR';

export default class PRService {
  /**
   * Replaces existing PR Labels with new labels based on the PR Action.
   * @param labelReplacer - A function that removes a set of labels and adds another to a PR.
   * @param existingLabels - Existing set of Labels on said PR.
   * @param prAction - Type of action taking place on said PR.
   */
  public replaceExistingPRLabels(
    labelReplacer: (removalLabelName: string[], replacementLabelNames: string[]) => Promise<boolean>,
    existingLabels: GHLabel[],
    prAction: PRAction
  ): Promise<boolean> {
    const labelNamesToRemove: string[] = LabelService.extractLabelNames(
      LabelCollectionType.PRCollection,
      existingLabels
    );
    const labelNamesToAdd: string[] = [];
    switch (prAction) {
      case PRAction.READY_FOR_REVIEW:
      case PRAction.OPENED:
        labelNamesToAdd.push(LABEL_ARCHIVE.getLabel(LabelCollectionType.PRCollection, PRType.ToReview)?.name!);
        break;
      case PRAction.CONVERTED_TO_DRAFT:
        labelNamesToAdd.push(LABEL_ARCHIVE.getLabel(LabelCollectionType.PRCollection, PRType.OnGoing)?.name!);
        break;
    }

    return labelReplacer(labelNamesToRemove, labelNamesToAdd);
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
    prCommenter: (comment: string) => Promise<boolean>
  ): Promise<boolean> {
    const prCommitMessageRegex: RegExp = /Commit Message:[\r\n]+```[\r\n](.*)[\r\n]```/gis;
    const extractedMessageArray: RegExpExecArray | null = prCommitMessageRegex.exec(ghPr.body);

    if (!extractedMessageArray) {
      return true;
    }

    const extractedMessage: string = extractedMessageArray[1].trim();
    const commitMsgCorrectionMsg: string = this.getCommitMessageCorrectionMessage(extractedMessage);
    return await prCommenter(commitMsgCorrectionMsg);
  }

  /**
   * Validates commit messages and returns a validation result
   * string.
   * @param commitMsg - Proposed Commit message on PR.
   * @returns string containing validation results.
   */
  private getCommitMessageCorrectionMessage(commitMsg: string): string {
    const VALIDATION_TITLE = '## Commit Message Validation\n';
    const splitMsg: string[] = commitMsg.split('\n');

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

    return `${VALIDATION_TITLE}${validateCharCheck(splitMsg)}${validateSpaceBetweenTitleAndBody(splitMsg)}`;
  }
}
