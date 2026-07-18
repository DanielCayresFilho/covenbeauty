import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

// Todos os campos opcionais para atualização parcial (PATCH).
export class UpdateClientDto extends PartialType(CreateClientDto) {}
