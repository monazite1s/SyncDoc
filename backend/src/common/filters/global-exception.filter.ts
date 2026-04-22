import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import type { ApiError } from '@collab/types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errors: Record<string, string[]> | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const responseObj = exceptionResponse as Record<string, unknown>;
                message = (responseObj.message as string) || exception.message;
                errors = responseObj.errors as Record<string, string[]> | undefined;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        const errorResponse: ApiError = {
            success: false,
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
        };

        if (errors) {
            // ApiError 允许扩展 errors 字段
            (errorResponse as ApiError & { errors?: Record<string, string[]> }).errors = errors;
        }

        response.status(status).json(errorResponse);
    }
}
