import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SendContactInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message: string;
}
