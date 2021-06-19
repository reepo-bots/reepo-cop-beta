import GHPr from './model_ghPR';
import Label from './model_label';
import User from './model_user';
import { LABEL_ARCHIVE } from '../constants/const_labels';
import { LabelCollectionType } from './model_labelCollection';

export enum PRAction {
  READY_FOR_REVIEW = 'Ready for Review',
  EDITED = 'Edited',
  CLOSED = 'Closed',
  OPENED = 'Opened',
  CONVERTED_TO_DRAFT = 'Converted to Draft',
}

export default class PullRequest {
  private _number: number;
  private _state: 'open' | 'closed' | 'all';
  private _title: string;
  private _user: User;
  private _body: string;
  private _labels: Label[];
  private _created_at: string;
  private _updated_at: string;
  private _closed_at?: string;
  private _merged_at?: string;
  private _draft?: boolean;

  constructor(ghPR: GHPr) {
    this._number = ghPR.number;
    this._state = ghPR.state;
    this._title = ghPR.title;
    this._user = new User(ghPR.user);
    this._body = ghPR.body;
    this._labels = LABEL_ARCHIVE.mapGHLabels(ghPR.labels);
    this._created_at = ghPR.created_at;
    this._updated_at = ghPR.updated_at;
    this._closed_at = ghPR?.closed_at;
    this._merged_at = ghPR?.merged_at;
    this._draft = ghPR?.draft;
  }

  /**
   * Extracts an 'Issue' Label from set of Labels.
   * @returns Label that is an 'Issue' Label.
   */
  public getIssueLabel(): Label | undefined {
    return this._labels.find((label: Label) => label.name.includes(LabelCollectionType.IssueCollection));
  }

  public get draft(): boolean | undefined {
    return this._draft;
  }

  public get merged_at(): string | undefined {
    return this._merged_at;
  }

  public get closed_at(): string | undefined {
    return this._closed_at;
  }

  public get updated_at(): string {
    return this._updated_at;
  }

  public get created_at(): string {
    return this._created_at;
  }

  public get body(): string {
    return this._body;
  }

  public get title(): string {
    return this._title;
  }

  public get labels(): Label[] {
    return this._labels;
  }

  public get user(): User {
    return this._user;
  }

  public get state(): string {
    return this._state;
  }

  public get number(): number {
    return this._number;
  }
}
