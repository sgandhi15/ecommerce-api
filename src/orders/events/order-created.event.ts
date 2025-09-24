export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly orderNumber: string,
    public readonly items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>,
    public readonly totalAmount: number,
  ) {}
}
