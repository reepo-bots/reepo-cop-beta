/**
 * Enum exists as an accessible Identification
 * for each created label.
 * NOTE: Each LabelAction is unique and can only
 * be assigned once to a Label.
 */
 export enum PRType {
  ToReview = 'ToReview',
  ToMerge = 'ToMerge',
  OnGoing = 'OnGoing',
  Paused = 'OnHold',
}

export enum AspectType {
  Bug = 'Bug',
  Feature = 'Feature',
  Documentation = 'Doc',
  Enhancement = 'Enhancement',
  Process = 'Process'
}

export enum PriorityType {
  Urgent = 'Urgent',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}

export enum ChangelogType {
  DoNotList = 'DoNotList'
}

export enum IssueType {
  WontFix = 'WontFix',
  GoodFirstIssue = 'GoodFirstIssue',
  Duplicate = 'Duplicate'
}

type LabelType = PRType | AspectType | PriorityType | ChangelogType | IssueType;
export default LabelType;
