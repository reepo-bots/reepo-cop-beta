import LabelArchive from '../model/model_labelArchive';
import Label from '../model/model_label';
import { PRType, PriorityType, AspectType, ChangelogType, IssueType } from '../model/model_label_type';
import LabelCollection, { LabelCollectionType } from '../model/model_labelCollection';

export const LABEL_ARCHIVE: LabelArchive = new LabelArchive([
  new LabelCollection(LabelCollectionType.AspectCollection, [
    new Label(
      `🐞 ${LabelCollectionType.AspectCollection}.${AspectType.Bug}`,
      'This issue describes a bug.',
      'AA5117',
      'bug',
      AspectType.Bug
    ),
    new Label(
      `⚙️ ${LabelCollectionType.AspectCollection}.${AspectType.Process}`,
      'This issue describes an element of the project\'s process.',
      'F0FF01',
      'process',
      AspectType.Process
    ),
    new Label(
      `💡 ${LabelCollectionType.AspectCollection}.${AspectType.Feature}`,
      'This issue describes a new feature.',
      '120BB0',
      'feature',
      AspectType.Feature
    ),
    new Label(
      `📈 ${LabelCollectionType.AspectCollection}.${AspectType.Enhancement}`,
      'This issue describes an enhancement to an existing feature.',
      '19504B',
      'enhance',
      AspectType.Enhancement
    ),
    new Label(
      `📚 ${LabelCollectionType.AspectCollection}.${AspectType.Documentation}`,
      'This issue describes a change to the existing documentation.',
      '0075CA',
      'doc',
      AspectType.Documentation
    )
  ]),
  new LabelCollection(LabelCollectionType.PRCollection, [
    new Label(
      `🏃 ${LabelCollectionType.PRCollection}.${PRType.OnGoing}`,
      'This PR is still in progress.',
      '2FEFDD',
      ['progress', 'ongoing'],
      PRType.OnGoing
    ),
    new Label(
      `👍 ${LabelCollectionType.PRCollection}.${PRType.ToMerge}`,
      'This PR is ready for merger.',
      '0E8A16',
      'merge',
      PRType.ToMerge
    ),
    new Label(
      `🔬 ${LabelCollectionType.PRCollection}.${PRType.ToReview}`,
      'This PR is ready for review.',
      'BA50EB',
      'review',
      PRType.ToReview
    ),
    new Label(
      `🛑 ${LabelCollectionType.PRCollection}.${PRType.Paused}`,
      "This PR's progress is halted.",
      'C5DEF5',
      'hold',
      PRType.Paused
    )
  ]),
  new LabelCollection(LabelCollectionType.PriorityCollection, [
    new Label(
      `🔥 ${LabelCollectionType.PriorityCollection}.${PriorityType.Urgent}`,
      'This must be completed immediately.',
      '3A0002',
      PriorityType.Urgent.toLowerCase(),
      PriorityType.Urgent
    ),
    new Label(
      `🚨 ${LabelCollectionType.PriorityCollection}.${PriorityType.High}`,
      'This should be worked on ASAP.',
      '6F0004',
      PriorityType.High.toLowerCase(),
      PriorityType.High
    ),
    new Label(
      `⏲️ ${LabelCollectionType.PriorityCollection}.${PriorityType.Medium}`,
      'This should be tackled when possible.',
      'AD0007',
      PriorityType.Medium.toLowerCase(),
      PriorityType.Medium
    ),
    new Label(
      `📭 ${LabelCollectionType.PriorityCollection}.${PriorityType.Low}`,
      "This can be completed after existing backlog of higher priority items.",
      'FE000A',
      PriorityType.Low.toLowerCase(),
      PriorityType.Low
    )
  ]),
  new LabelCollection(LabelCollectionType.ChangelogCollection, [
    new Label(
      `👻 ${LabelCollectionType.ChangelogCollection}.${ChangelogType.DoNotList}`,
      "This Pull Request will NOT be listed in the Release Changelog",
      '000000',
      ChangelogType.DoNotList.toLowerCase(),
      ChangelogType.DoNotList
    )
  ]),
  new LabelCollection(LabelCollectionType.IssueCollection, [
    new Label(
      `❌ ${LabelCollectionType.IssueCollection}.${IssueType.WontFix}`,
      'This issue describes a suggestion that will not be fixed.',
      'FFFFFF',
      IssueType.WontFix.toLowerCase(),
      IssueType.WontFix
    ),
    new Label(
      `👯‍♂️ ${LabelCollectionType.IssueCollection}.${IssueType.Duplicate}`,
      'This issue describes a suggestion that will not be fixed.',
      'FFFFFF',
      IssueType.Duplicate.toLowerCase(),
      IssueType.Duplicate
    ),
    new Label(
      `🥇 ${LabelCollectionType.IssueCollection}.${IssueType.GoodFirstIssue}`,
      'This issue describes a suggestion that will not be fixed.',
      'FFFFFF',
      'good first issue',
      IssueType.GoodFirstIssue
    )
  ])
]);
