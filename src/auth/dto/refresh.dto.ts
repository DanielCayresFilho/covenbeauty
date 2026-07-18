import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token emitido no login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
