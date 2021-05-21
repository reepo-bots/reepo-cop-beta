import { createHash } from 'crypto';

/**
 * Enum exists as an accessible Identification
 * for each created label.
 * NOTE: Each LabelAction is unique and can only
 * be assigned once to a Label.
 */
enum LabelActions {
  ToReview = 'To Review',
  ToMerge = 'To Merge',
  WIP = 'WIP', // Work-In-Progress
  Paused = 'OnHold',
  Bug = 'Bug',
  WontFix = 'Wont Fix',
  Feature = 'Feature',
  Documentation = 'Documentation',
  Enhancement = 'Enhancement'
}

export class Label {
  private _labelName: string;
  private _labelDesc: string;
  private _labelColor: string;
  private _labelIdentifier: string;
  private _labelAliases: string[];
  private _labelAction: LabelActions;

  constructor(labelName: string, labelDesc: string, labelColor: string, labelSubstr: string | string[], labelAction: LabelActions) {
    this._labelName = labelName;
    this._labelDesc = labelDesc;
    this._labelColor = labelColor;
    this._labelIdentifier = Label.GenerateIdentifier(labelName, labelDesc, labelColor);
    this._labelAliases = ((typeof labelSubstr === 'string' || labelSubstr instanceof String) ? [labelSubstr] : labelSubstr) as string[]; 
    this._labelAction = labelAction;
  }

  public static GenerateIdentifier(labelName: string, labelDesc: string, labelColor: string) {
    const hash = createHash('sha256');
    hash.update(labelName);
    hash.update(labelDesc);
    hash.update(labelColor);
    return hash.digest('hex');
  }

  public get labelName(): string {
    return this._labelName;
  }

  public get labelDesc(): string {
    return this._labelDesc;
  }

  public get labelColor(): string {
    return this._labelColor;
  }

  public get labelIdentifier(): string {
    return this._labelIdentifier;
  }

  public get labelAlias(): string[] {
    return this._labelAliases;
  }

  public get labelAction(): LabelActions {
    return this._labelAction;
  }
}

enum LabelCollectionType {
  IssueCollection = 'Issue Labels',
  PRCollection = 'PR Labels'
}

class LabelCollection {

  private _collectionType: LabelCollectionType;
  private _labels: Label[];

  constructor(collectionType: LabelCollectionType, labels: Label[]) {
    this._collectionType = collectionType;
    this._labels = this.getValidatedLabels(labels);
  }

  private getValidatedLabels(labels: Label[]): Label[] {
    const labelActionSet: Set<string> = new Set<string>();
    const verifiedLabels: Label[] = [];
    for (const label of labels) {
      if (labelActionSet.has(label.labelAction)) {
        console.error(`${label.labelAction} has been defined before.`)
      } else {
        labelActionSet.add(label.labelAction);
        verifiedLabels.concat(label);
      }
    }
    return verifiedLabels;
  }

  public get collectionType(): string {
    return this._collectionType;
  }

  public get labels(): Label[] {
    return this._labels;
  }
}

class LabelArchive {

  private _labelCollections: LabelCollection[];

  constructor(labelCollections: LabelCollection[]) {
    this._labelCollections = labelCollections;
  }

  public collatePresetSubstrings(): Map<string[], Label> {
    const presetSubstrMap: Map<string[], Label> = new Map();
    this._labelCollections.forEach((labelCollection: LabelCollection) => {
      labelCollection.labels.forEach((label: Label) => {
        presetSubstrMap.set(label.labelAlias, label);
      });
    })
    return presetSubstrMap;
  }

  public collatePresetLabels(): Label[] {
    return this._labelCollections.flatMap((labelCollection: LabelCollection) => {
        return labelCollection.labels;
    });
  }

  public getLabel(labelCollectionType: LabelCollectionType, labelAction: LabelActions): Label {
    const filteredLabels: Label[] = this._labelCollections
      .filter((labelCollection: LabelCollection) => labelCollection.collectionType === labelCollectionType)
      .flatMap((labelCollection: LabelCollection) => {
        return labelCollection.labels.filter((label: Label) => label.labelAction === labelAction);
    });
    
    if (filteredLabels.length === 0 || !filteredLabels) {
      console.error(`No Label Error: Label -> ${labelAction} from collection ${labelCollectionType} does not exist.`);
    } else if (filteredLabels.length > 1) {
      console.error(`Label Collection Definition Error: Multiple Labels -> ${labelAction} from collection ${labelCollectionType} found.`);
    }

    return filteredLabels[0];
  }
}

export const LABEL_ARCHIVE: LabelArchive = new LabelArchive(
  [
    new LabelCollection(
      LabelCollectionType.IssueCollection,
        [
            new Label('🐞 issue.Bug', 'This issue describes a bug.', 'D73A4A', 'bug', LabelActions.Bug),
            new Label('⚙️ issue.Feature', 'This issue describes a new feature.', '120BB0', 'feature', LabelActions.Feature),
            new Label('📈 issue.Enhancement', 'This issue describes an enhancement to an existing feature.', '19504B', 'enhance', LabelActions.Enhancement),
            new Label('📚 issue.Documentation', 'This issue describes a change to the existing documentation.', '0075CA', 'doc', LabelActions.Documentation),
            new Label('❌ issue.WontFix', 'This issue describes a suggestion that will not be fixed.', 'FFFFFF', 'wontfix', LabelActions.WontFix)
        ]
    ),
    new LabelCollection(
      LabelCollectionType.PRCollection,
        [
            new Label('🏃 pr.Ongoing', 'This PR is still in progress.', '2FEFDD', ['progress', 'ongoing'], LabelActions.WIP),
            new Label('👍 pr.ToMerge', 'This PR is ready for merger.', '0E8A16', 'merge', LabelActions.ToMerge),
            new Label('🔬 pr.ToReview', 'This PR is ready for review.', 'BA50EB', 'review', LabelActions.ToReview),
            new Label('🛑 pr.OnHold', 'This PR\'s progress is halted.', 'C5DEF5', 'hold', LabelActions.Paused)
        ]
    )
  ]
);

export interface OctokitLabelResponse {
    name: string;
    description: string;
    color: string;
}

export class LabelService {

    /**
     * Updates any existing labels that match the set of preset labels.
     * @param octokitLabelsFetchResponse - Label data fetched from Github
     * @param labelCreator - Callback function that allows for Label creation on Github.
     * @param labelUpdater - Callback function that allows for label updating on Github.
     * @returns List of updated Labels.
     */
    public updateLabels(octokitLabelsFetchResponse: OctokitLabelResponse[],
        labelUpdater: (oldName: string, newName: string, desc: string, color: string) => Promise<any>
        ): Label[] {
        
        let remainingLabels: Label[] = LABEL_ARCHIVE.collatePresetLabels();
        const presetSubstrIdentifiers: Map<string[], Label> = LABEL_ARCHIVE.collatePresetSubstrings();
        presetSubstrIdentifiers.forEach((label:Label, substrings: string[]) => {
            for (const substr of substrings) {
                let isMatched = false;
                
                for(const labelResponseIndex in octokitLabelsFetchResponse) {

                    if(octokitLabelsFetchResponse[labelResponseIndex].name.toLowerCase().includes(substr)) {
                        
                        isMatched = true;

                        if (this.doesLabelNeedUpdating(label, octokitLabelsFetchResponse[labelResponseIndex])) {
                            labelUpdater(octokitLabelsFetchResponse[labelResponseIndex].name, label.labelName, label.labelDesc, label.labelColor);   
                        }

                        octokitLabelsFetchResponse.splice(+labelResponseIndex, 1);
                        remainingLabels = remainingLabels.filter((labelFromAll: Label) => labelFromAll.labelName !== label.labelName);
                        break;
                    }
                }
                if (isMatched) {
                    break;
                }
            };
        });
        
        return remainingLabels;
    }

    private doesLabelNeedUpdating(comparisonLabel: Label, labelResponse: OctokitLabelResponse): boolean {
        return !(comparisonLabel.labelName === labelResponse.name
            && comparisonLabel.labelDesc === labelResponse.description
            && comparisonLabel.labelColor === labelResponse.color);
    }

    /**
     * Creates remaining missing labels on Github.
     * @param remainingLabels - Labels that are missing from Github.
     * @param labelCreator - Callback function that enables Label Creation.
     */
    public generateMissingLabels(remainingLabels: Label[],
        labelCreator: (name: string, desc: string, color: string) => Promise<any>
    ): void {

        remainingLabels.forEach(async (label: Label) => 
            await labelCreator(label.labelName, label.labelDesc, label.labelColor)
                .catch(() => console.log(`Error in creating ${label.labelName}?`))
        );
    }
}
