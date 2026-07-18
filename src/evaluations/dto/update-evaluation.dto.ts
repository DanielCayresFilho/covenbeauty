import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEvaluationDto } from './create-evaluation.dto';

// Não muda o cliente da ficha (é um prontuário histórico dele).
export class UpdateEvaluationDto extends PartialType(
  OmitType(CreateEvaluationDto, ['clientId'] as const),
) {}
