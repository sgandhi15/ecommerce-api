export class ProductLookupRequestEvent {
  constructor(
    public readonly productId: string,
    public readonly requestId: string,
  ) {}
}

export class ProductLookupResponseEvent {
  constructor(
    public readonly requestId: string,
    public readonly product: {
      _id: string;
      name: string;
      price: number;
      stock: number;
    } | null,
    public readonly error?: string,
  ) {}
}

export class StockValidationRequestEvent {
  constructor(
    public readonly items: Array<{
      productId: string;
      quantity: number;
    }>,
    public readonly requestId: string,
  ) {}
}

export class StockValidationResponseEvent {
  constructor(
    public readonly requestId: string,
    public readonly validationResults: Array<{
      productId: string;
      isValid: boolean;
      availableStock: number;
      requestedQuantity: number;
      error?: string;
    }>,
    public readonly allValid: boolean,
  ) {}
}
