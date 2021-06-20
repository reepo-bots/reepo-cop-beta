import GHUser from './model_ghUser';

export default class User {
  private _login: string;
  private _id: number;
  private _url: string;
  private _type: string;

  constructor(ghUser: GHUser) {
    this._login = ghUser.login;
    this._id = ghUser.id;
    this._url = ghUser.url;
    this._type = ghUser.type;
  }

  public get login(): string {
    return this._login;
  }

  public get id(): number {
    return this._id;
  }

  public get url(): string {
    return this._url;
  }

  public get type(): string {
    return this._type;
  }
}
