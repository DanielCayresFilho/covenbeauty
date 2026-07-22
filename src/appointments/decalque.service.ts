import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  imagePath,
  removeImage,
  saveImage,
  type UploadedImage,
} from '@/common/uploads';

const SUB = 'decalques';

/** Decalque (stencil) da tatuagem — 1 imagem por agendamento. */
@Injectable()
export class DecalqueService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(appointmentId: string, file: UploadedImage | undefined) {
    const appt = await this.ensureAppointment(appointmentId);

    const saved = await saveImage(SUB, file);

    // Remove o decalque anterior, se houver.
    if (appt.decalqueFilename) {
      await removeImage(SUB, appt.decalqueFilename);
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { decalqueFilename: saved.filename, decalqueMime: saved.mimeType },
      select: { id: true, decalqueFilename: true, decalqueMime: true },
    });
  }

  async fileOf(appointmentId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { decalqueFilename: true, decalqueMime: true },
    });
    if (!appt?.decalqueFilename) {
      throw new NotFoundException('Este agendamento não tem decalque');
    }
    return {
      path: imagePath(SUB, appt.decalqueFilename),
      mimeType: appt.decalqueMime ?? 'image/jpeg',
    };
  }

  async remove(appointmentId: string) {
    const appt = await this.ensureAppointment(appointmentId);
    if (appt.decalqueFilename) {
      await removeImage(SUB, appt.decalqueFilename);
    }
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { decalqueFilename: null, decalqueMime: null },
    });
    return { deleted: true, id: appointmentId };
  }

  private async ensureAppointment(id: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: { id: true, type: true, decalqueFilename: true },
    });
    if (!appt || appt.type !== AppointmentType.APPOINTMENT) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    return appt;
  }
}
