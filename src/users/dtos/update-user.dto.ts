import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../schemas/user.schema';
import {
  IsOptional,
  MinLength,
  MaxLength,
  IsEmail,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'The name of the user',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(20)
  name?: string;

  @ApiProperty({
    description: 'The email of the user',
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The password of the user',
    minLength: 8,
    maxLength: 20,
    format: 'password',
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(20)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password?: string;

  @ApiProperty({
    description: 'The role of the user',
    enum: UserRole,
  })
  role?: UserRole;
}
