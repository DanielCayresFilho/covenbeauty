import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EvaluationFocus, Fitzpatrick, SkinType } from '@prisma/client';

export class CreateEvaluationDto {
  @ApiProperty({ description: 'Cliente da ficha' })
  @IsUUID('4', { message: 'Cliente inválido' })
  clientId: string;

  @ApiPropertyOptional({ enum: EvaluationFocus, default: EvaluationFocus.BOTH })
  @IsOptional()
  @IsEnum(EvaluationFocus)
  focus?: EvaluationFocus;

  @ApiPropertyOptional({ description: 'Data da avaliação (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  evaluationDate?: string;

  // ── 2. Histórico de saúde geral ──
  @ApiPropertyOptional({ description: 'Alergias: cosméticos, medicamentos, alimentos, iodo...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  allergies?: string;

  @ApiPropertyOptional({ description: 'Doenças crônicas (diabetes, hipertensão, tireoide...)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chronicDiseases?: string;

  @ApiPropertyOptional({ description: 'Alterações hormonais (SOP, menopausa, anticoncepcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  hormonalChanges?: string;

  @ApiPropertyOptional({ description: 'Uso de medicamentos (Roacutan, corticoides, anticoagulantes...)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medications?: string;

  @ApiPropertyOptional({ description: 'Possui marca-passo (contraindica correntes elétricas)' })
  @IsOptional()
  @IsBoolean()
  hasPacemaker?: boolean;

  @ApiPropertyOptional({ description: 'Possui pinos/implantes metálicos' })
  @IsOptional()
  @IsBoolean()
  hasMetalImplants?: boolean;

  @ApiPropertyOptional({ description: 'Possui implante dentário' })
  @IsOptional()
  @IsBoolean()
  hasDentalImplant?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  prosthesesNotes?: string;

  @ApiPropertyOptional({ description: 'Está grávida' })
  @IsOptional()
  @IsBoolean()
  isPregnant?: boolean;

  @ApiPropertyOptional({ description: 'Está amamentando' })
  @IsOptional()
  @IsBoolean()
  isBreastfeeding?: boolean;

  @ApiPropertyOptional({ description: 'Cirurgia nos últimos 6 meses' })
  @IsOptional()
  @IsBoolean()
  recentSurgery?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  recentSurgeryNotes?: string;

  // ── 3. Hábitos de vida ──
  @ApiPropertyOptional({ description: 'Horas de sono por noite' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  sleepHoursPerNight?: number;

  @ApiPropertyOptional({ description: 'Acorda cansado' })
  @IsOptional()
  @IsBoolean()
  wakesUpTired?: boolean;

  @ApiPropertyOptional({ description: 'Litros de água por dia' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  waterIntakeLiters?: number;

  @ApiPropertyOptional({ description: 'Intestino funciona regularmente' })
  @IsOptional()
  @IsBoolean()
  regularBowelFunction?: boolean;

  @ApiPropertyOptional({ description: 'Fuma' })
  @IsOptional()
  @IsBoolean()
  smokes?: boolean;

  @ApiPropertyOptional({ description: 'Consome bebida alcoólica com frequência' })
  @IsOptional()
  @IsBoolean()
  drinksAlcohol?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  habitsNotes?: string;

  @ApiPropertyOptional({ description: 'Nível de estresse (1 a 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  stressLevel?: number;

  // ── 4. Estética facial ──
  @ApiPropertyOptional({ enum: Fitzpatrick, description: 'Fototipo (Fitzpatrick I-VI)' })
  @IsOptional()
  @IsEnum(Fitzpatrick)
  fitzpatrick?: Fitzpatrick;

  @ApiPropertyOptional({ enum: SkinType, description: 'Tipo de pele' })
  @IsOptional()
  @IsEnum(SkinType)
  skinType?: SkinType;

  @ApiPropertyOptional({ description: 'Rotina de skincare home care' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  skincareRoutine?: string;

  @ApiPropertyOptional({ description: 'Usa protetor solar diariamente' })
  @IsOptional()
  @IsBoolean()
  usesSunscreen?: boolean;

  @ApiPropertyOptional({ description: 'FPS do protetor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  sunscreenSpf?: number;

  @ApiPropertyOptional({ description: 'Reaplica o protetor solar' })
  @IsOptional()
  @IsBoolean()
  reappliesSunscreen?: boolean;

  @ApiPropertyOptional({ description: 'Histórico estético (botox, preenchimento, fios PDO, cirurgia)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  facialAestheticHistory?: string;

  @ApiPropertyOptional({ description: 'Pele fica vermelha/irritada com facilidade' })
  @IsOptional()
  @IsBoolean()
  skinSensitivity?: boolean;

  @ApiPropertyOptional({ description: 'Tem rosácea' })
  @IsOptional()
  @IsBoolean()
  hasRosacea?: boolean;

  @ApiPropertyOptional({ description: 'Exposição solar frequente / trabalha ao ar livre' })
  @IsOptional()
  @IsBoolean()
  frequentSunExposure?: boolean;

  // ── 5. Estética capilar (tricologia) ──
  @ApiPropertyOptional({ description: 'Lavagens por semana' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  washFrequencyPerWeek?: number;

  @ApiPropertyOptional({ description: 'Queixas no couro cabeludo (coceira, caspa, dor, oleosidade, feridas)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  scalpComplaints?: string;

  @ApiPropertyOptional({ description: 'Percebe queda excessiva' })
  @IsOptional()
  @IsBoolean()
  hasHairLoss?: boolean;

  @ApiPropertyOptional({ description: 'Há quanto tempo a queda' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hairLossDuration?: string;

  @ApiPropertyOptional({ description: 'Histórico familiar de calvície (alopecia)' })
  @IsOptional()
  @IsBoolean()
  familyBaldnessHistory?: boolean;

  @ApiPropertyOptional({ description: 'Químicas nos fios (progressiva, alisamento, descoloração, tintura)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chemicalTreatments?: string;

  @ApiPropertyOptional({ description: 'Data do último procedimento químico (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  lastChemicalDate?: string;

  @ApiPropertyOptional({ description: 'Usa secador/chapinha/babyliss com frequência' })
  @IsOptional()
  @IsBoolean()
  usesHeatTools?: boolean;

  @ApiPropertyOptional({ description: 'Usa protetor térmico' })
  @IsOptional()
  @IsBoolean()
  usesThermalProtector?: boolean;

  @ApiPropertyOptional({ description: 'Rotina capilar (shampoo, condicionador, máscaras, tônicos)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  hairCareRoutine?: string;

  // ── 6. Termo de consentimento e assinatura ──
  @ApiPropertyOptional({ description: 'Declara que as informações são verdadeiras' })
  @IsOptional()
  @IsBoolean()
  declarationAccepted?: boolean;

  @ApiPropertyOptional({ description: 'Autoriza fotos para prontuário interno' })
  @IsOptional()
  @IsBoolean()
  authorizesImageInternal?: boolean;

  @ApiPropertyOptional({ description: 'Autoriza fotos para redes sociais' })
  @IsOptional()
  @IsBoolean()
  authorizesImageSocialMedia?: boolean;

  @ApiPropertyOptional({ description: 'Nome de quem assinou' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  signedByName?: string;

  @ApiPropertyOptional({ description: 'Data/hora da assinatura (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional({ description: 'Assinatura (imagem base64 ou URL)' })
  @IsOptional()
  @IsString()
  signatureDataUrl?: string;

  @ApiPropertyOptional({ description: 'Observações gerais' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
