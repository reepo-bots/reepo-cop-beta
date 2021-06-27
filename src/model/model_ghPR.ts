import GHLabel from './model_ghLabel';
import GHUser from './model_ghUser';
import GHMilestone from './model_ghMilestone';
import { LabelCollectionType } from './model_labelCollection';
import LabelType from './model_label_type';
import GHPRComment from './model_ghPrComment';

export default interface GHPr {
  url: string;
  number: number;
  state: string;
  title: string;
  user: GHUser | null;
  body: string | null;
  labels: GHLabel[];
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  merged_at?: string | null;
  milestone?: GHMilestone | null;
  draft?: boolean;
  comments_url?: string;
  comments?: GHPRComment[];
}

export class GHPrHandler {
  public static FindLabelByType(
    ghPr: GHPr,
    collectionType: LabelCollectionType,
    labelType?: LabelType
  ): GHLabel | undefined {
    return ghPr.labels.find(
      (label: GHLabel) => label?.name?.includes(collectionType) && (labelType ? label?.name?.includes(labelType) : true)
    );
  }

  public static IsPrWithinDateTimeConstraints(
    ghPr: GHPr,
    prPropertyToCheck: 'created_at' | 'updated_at' | 'merged_at' | 'closed_at',
    dateTimeData?: { startDateTime?: Date; endDateTime?: Date }
  ): boolean {

    // If no Date-Range is provided or no params
    // are provided then time constraint is always met.
    if (!ghPr[prPropertyToCheck]) {
      return true;
    }

    const rangeStart: number = (
      dateTimeData?.startDateTime ? dateTimeData.startDateTime : new Date(1)
    ).getTime();
    const rangeEnd: number = (dateTimeData?.endDateTime ? dateTimeData.endDateTime : new Date()).getTime();
    const comparisonTime: number = new Date(ghPr[prPropertyToCheck] as string).getTime();

    return comparisonTime >= rangeStart && comparisonTime <= rangeEnd;
  }
}
