import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class ShippingAddressDto {
  @ApiProperty({ description: 'Street address', example: '123 Main St' })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({ description: 'City', example: 'New York' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ description: 'State/Province', example: 'NY' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ description: 'Postal/ZIP code', example: '10001' })
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'Country', example: 'United States' })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({
    description: 'Additional address information',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Shipping address for the order',
    type: ShippingAddressDto,
  })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;
}
