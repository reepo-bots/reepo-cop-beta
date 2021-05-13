import { createHash } from 'crypto';

class Label {
    private _labelName: string;
    private _labelDesc: string;
    private _labelColor: string;
    private _labelIdentifier: string;

    constructor(labelName: string, labelDesc: string, labelColor: string) {
        this._labelName = labelName;
        this._labelDesc = labelDesc;
        this._labelColor = labelColor;
        this._labelIdentifier = Label.GenerateIdentifier(labelName, labelDesc, labelColor);
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
}

class LabelCollection {
    private _collectionName: string;
    private _labels: Label[];

    constructor(collectionName: string, labels: Label[]) {
        this._collectionName = collectionName;
        this._labels = labels;
    }

    public get collectionName(): string {
        return this._collectionName;
    }

    public get labels(): Label[] {
        return this._labels;
    }


}

const LABELS_COLLECTIONS: LabelCollection[] = [
    new LabelCollection(
        'Issue Labels',
        [
            new Label('🐞 issue.Bug', 'This issue describes a bug.', 'D73A4A'),
            new Label('⚙️ issue.Feature', 'This issue describes a new feature.', '120BB0'),
            new Label('📈 issue.Enhancement', 'This issue describes an enhancement to an existing feature.', '19504B'),
            new Label('📚 issue.Documentation', 'This issue describes a change to the existing documentation.', '0075CA')
        ]
    ),
    new LabelCollection(
        'PR Labels',
        [
            new Label('🏃 pr.Ongoing', 'This PR is still in progress.', '2FEFDD'),
            new Label('👍 pr.ToMerge', 'This PR is ready for merger.', '0E8A16'),
            new Label('🔬 pr.ToReview', 'This PR is ready for review.', 'BA50EB'),
            new Label('🛑 pr.OnHold', 'This PR\'s progress is halted.', 'C5DEF5')
        ]
    )
]



export interface OctokitLabelResponse {
    name: string;
    description: string;
    color: string;
}

export class LabelService {

    private collatePresetLabelIdentifiers(): Map<string, Label> {
        const presetIdentifierMap: Map<string, Label> = new Map();
        LABELS_COLLECTIONS.forEach((labelCollection: LabelCollection) => {
            return labelCollection.labels.forEach((label: Label) => {
                presetIdentifierMap.set(label.labelIdentifier, label);
            });
        });
        return presetIdentifierMap;
    }

    public updateLabels(octokitLabelsFetchResponse: OctokitLabelResponse[],
        labelCreator: (name: string, desc: string, color: string) => void) {
        const presetLabelIdentifiers: Map<string, Label> = this.collatePresetLabelIdentifiers();
        const responseLabelIdentifiers: Set<string> = new Set(
            octokitLabelsFetchResponse.map((labelResponse: OctokitLabelResponse) =>
                Label.GenerateIdentifier(labelResponse.name, labelResponse.description, labelResponse.color))
        );
        presetLabelIdentifiers.forEach((label: Label, identifier: string) => {
            if(!responseLabelIdentifiers.has(identifier)) {
                labelCreator(label.labelName, label.labelDesc, label.labelColor);
            }
        });
    }
}