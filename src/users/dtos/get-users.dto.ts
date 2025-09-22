import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetUserByEmailDto {
  @ApiProperty({
    description: 'The email of the user',
    format: 'email',
  })
  @IsString()
  @IsNotEmpty()
  email: string;
}
