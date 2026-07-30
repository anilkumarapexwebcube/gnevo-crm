import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ProblemDetails } from '@gnevo/types';

/**
 * Serializes every error as an RFC 9457 Problem Details document, so API
 * consumers get a consistent, machine-readable error shape.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let title = 'Internal Server Error';
    let detail: string | undefined;
    let errors: ProblemDetails['errors'];

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        title = payload;
      } else if (payload && typeof payload === 'object') {
        const p = payload as Record<string, unknown>;
        title = (p.title as string) ?? (p.error as string) ?? exception.message;
        detail = Array.isArray(p.message)
          ? (p.message as string[]).join(', ')
          : (p.message as string | undefined);
        errors = p.errors as ProblemDetails['errors'];
      }
    } else {
      this.logger.error(exception);
    }

    const body: ProblemDetails = {
      type: `https://api.gnevo.crm/errors/${status}`,
      title,
      status,
      detail,
      instance: req.originalUrl,
      requestId: (req.headers['x-request-id'] as string) ?? undefined,
      errors,
    };

    res.status(status).json(body);
  }
}
