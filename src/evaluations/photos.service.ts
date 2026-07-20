import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UploadPhotoDto } from './dto/upload-photo.dto';

/** Arquivo recebido pelo FileInterceptor (evita depender de @types/multer). */
export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Tipos aceitos → extensão gravada (a extensão NUNCA vem do nome enviado). */
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

/** Diretório do volume persistente (Coolify monta aqui). */
export function uploadRoot(): string {
  return resolve(process.env.UPLOAD_DIR ?? './uploads', 'evaluations');
}

@Injectable()
export class EvaluationPhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(
    evaluationId: string,
    file: UploadedImage | undefined,
    dto: UploadPhotoDto,
  ) {
    if (!file) {
      throw new BadRequestException('Envie uma imagem no campo "file"');
    }
    const ext = MIME_EXT[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        'Formato não suportado. Envie JPG, PNG, WEBP ou HEIC.',
      );
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Imagem muito grande (máximo 8 MB)');
    }

    await this.ensureEvaluation(evaluationId);

    const dir = uploadRoot();
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}${ext}`;
    await writeFile(join(dir, filename), file.buffer);

    return this.prisma.evaluationPhoto.create({
      data: {
        evaluationId,
        stage: dto.stage,
        moment: dto.moment,
        caption: dto.caption,
        filename,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  }

  async findAll(evaluationId: string) {
    await this.ensureEvaluation(evaluationId);
    return this.prisma.evaluationPhoto.findMany({
      where: { evaluationId },
      orderBy: [{ stage: 'asc' }, { moment: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Caminho absoluto do arquivo para o controller enviar ao cliente. */
  async fileOf(photoId: string) {
    const photo = await this.prisma.evaluationPhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo) {
      throw new NotFoundException('Foto não encontrada');
    }
    // filename é sempre um UUID gerado por nós — sem risco de path traversal.
    return { path: join(uploadRoot(), photo.filename), mimeType: photo.mimeType };
  }

  async remove(photoId: string) {
    const photo = await this.prisma.evaluationPhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo) {
      throw new NotFoundException('Foto não encontrada');
    }
    await this.prisma.evaluationPhoto.delete({ where: { id: photoId } });
    // O arquivo pode já não existir (volume recriado); não falha por isso.
    await unlink(join(uploadRoot(), photo.filename)).catch(() => undefined);
    return { deleted: true, id: photoId };
  }

  private async ensureEvaluation(id: string) {
    const exists = await this.prisma.clientEvaluation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Ficha de avaliação não encontrada');
    }
  }
}
