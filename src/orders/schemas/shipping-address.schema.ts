import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';

export type ShippingAddressDocument = HydratedDocument<ShippingAddress>;

@Schema()
export class ShippingAddress {
  @Prop({ required: true })
  @ApiProperty({ description: 'Street address', example: '123 Main St' })
  street: string;

  @Prop({ required: true })
  @ApiProperty({ description: 'City', example: 'New York' })
  city: string;

  @Prop({ required: true })
  @ApiProperty({ description: 'State/Province', example: 'NY' })
  state: string;

  @Prop({ required: true })
  @ApiProperty({ description: 'Postal/ZIP code', example: '10001' })
  postalCode: string;

  @Prop({ required: true })
  @ApiProperty({ description: 'Country', example: 'United States' })
  country: string;

  @Prop()
  @ApiProperty({
    description: 'Additional address information',
    required: false,
  })
  additionalInfo?: string;
}

export const ShippingAddressSchema =
  SchemaFactory.createForClass(ShippingAddress);
