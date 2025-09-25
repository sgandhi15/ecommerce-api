export class CartLookupRequestEvent {
  constructor(
    public readonly userEmail: string,
    public readonly requestId: string,
  ) {}
}

export class CartLookupResponseEvent {
  constructor(
    public readonly requestId: string,
    public readonly cart: {
      userId: string;
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      totalAmount: number;
    } | null,
    public readonly error?: string,
  ) {}
}

export class CartClearRequestEvent {
  constructor(
    public readonly userEmail: string,
    public readonly requestId: string,
  ) {}
}

export class CartClearResponseEvent {
  constructor(
    public readonly requestId: string,
    public readonly success: boolean,
    public readonly error?: string,
  ) {}
}
