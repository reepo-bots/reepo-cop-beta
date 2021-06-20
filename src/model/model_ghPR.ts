import GHLabel from './model_ghLabel';
import GHUser from './model_ghUser';
import GHMilestone from './model_ghMilestone';
import { LabelCollectionType } from './model_labelCollection';
import LabelType from './model_label_type';

export default interface GHPr {
  url: string;
  number: number;
  state: 'open' | 'closed' | 'all';
  title: string;
  user: GHUser;
  body: string;
  labels: GHLabel[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  milestone?: GHMilestone;
  draft?: boolean;
}

export class GHPrHandler {
  public static FindLabelByType(
    ghPr: GHPr,
    collectionType: LabelCollectionType,
    labelType?: LabelType
  ): GHLabel | undefined {
    return ghPr.labels.find(
      (label: GHLabel) => label.name.includes(collectionType) && (labelType ? label.name.includes(labelType) : true)
    );
  }
}
