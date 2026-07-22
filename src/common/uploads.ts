import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { BadRequestException } from '@nestjs/common';

/** Arquivo recebido pelo FileInterceptor (sem depender de @types/multer). */
export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Tipos aceitos → extensão gravada (a extensão NUNCA vem do nome enviado). */
export const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/** Diretório do volume persistente (Coolify monta em UPLOAD_DIR). */
export function uploadDir(sub: string): string {
  return resolve(process.env.UPLOAD_DIR ?? './uploads', sub);
}

/** Valida e grava a imagem; devolve o nome (uuid + extensão). */
export async function saveImage(
  sub: string,
  file: UploadedImage | undefined,
): Promise<{ filename: string; mimeType: string; size: number }> {
  if (!file) {
    throw new BadRequestException('Envie uma imagem no campo "file"');
  }
  const ext = MIME_EXT[file.mimetype];
  if (!ext) {
    throw new BadRequestException(
      'Formato não suportado. Envie JPG, PNG, WEBP ou HEIC.',
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('Imagem muito grande (máximo 8 MB)');
  }
  const dir = uploadDir(sub);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}${ext}`;
  await writeFile(join(dir, filename), file.buffer);
  return { filename, mimeType: file.mimetype, size: file.size };
}

/** Remove o arquivo (silencioso se já não existir). */
export async function removeImage(sub: string, filename: string): Promise<void> {
  await unlink(join(uploadDir(sub), filename)).catch(() => undefined);
}

/** Caminho absoluto de um arquivo salvo. */
export function imagePath(sub: string, filename: string): string {
  return join(uploadDir(sub), filename);
}
