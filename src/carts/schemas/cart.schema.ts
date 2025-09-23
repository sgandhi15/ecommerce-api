import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Item, ItemSchema } from './item.schema';

export type CartDocument = HydratedDocument<Cart>;

@Schema()
export class Cart {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId: string;

  @Prop({ required: true, type: [ItemSchema] })
  items: Item[];

  @Prop({ required: true })
  createdAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
