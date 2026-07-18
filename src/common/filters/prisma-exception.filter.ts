import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Traduz erros conhecidos do Prisma para respostas HTTP limpas, sem vazar
 * detalhes internos (nomes de colunas, SQL, stack) para o cliente.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Não foi possível processar a requisição';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Registro já existe (violação de unicidade)';
        break;
      case 'P2003':
        status = HttpStatus.CONFLICT;
        message = 'A operação viola um vínculo com outro registro';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado';
        break;
      default:
        // Loga o detalhe internamente, mas não devolve ao cliente.
        this.logger.error(`Prisma ${exception.code}: ${exception.message}`);
    }

    response.status(status).json({ statusCode: status, message });
  }
}
