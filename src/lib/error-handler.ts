import { NextApiRequest, NextApiResponse } from 'next';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Handle Twilio errors
  if (err.name === 'TwilioError') {
    return res.status(400).json({
      status: 'error',
      message: 'Error processing call request',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }

  // Handle OpenAI errors
  if (err.name === 'OpenAIError') {
    return res.status(500).json({
      status: 'error',
      message: 'Error processing AI request',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }

  // Handle Supabase errors
  if (err.name === 'PostgrestError') {
    return res.status(500).json({
      status: 'error',
      message: 'Database error',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }

  // Handle SendGrid errors
  if (err.name === 'SendGridError') {
    return res.status(500).json({
      status: 'error',
      message: 'Error sending email',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }

  // Default error
  console.error('Unhandled error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export function withErrorHandler(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (err) {
      errorHandler(err as Error, req, res, () => {});
    }
  };
} 