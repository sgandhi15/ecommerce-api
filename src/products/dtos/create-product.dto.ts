import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsPositive } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Product 1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The description of the product',
    example: 'Product 1 description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'The price of the product',
    example: 100,
  })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    description: 'The stock of the product',
    example: 100,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  stock: number;

  @ApiProperty({
    description: 'The image of the product',
    example: 'Product 1 image',
  })
  @IsString()
  @IsNotEmpty()
  image: string;
}
