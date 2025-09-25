export class UserLookupRequestEvent {
  constructor(
    public readonly email: string,
    public readonly requestId: string,
  ) {}
}

export class UserLookupResponseEvent {
  constructor(
    public readonly requestId: string,
    public readonly user: {
      _id: string;
      email: string;
      name: string;
    } | null,
    public readonly error?: string,
  ) {}
}
