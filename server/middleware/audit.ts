import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

/**
 * Middleware to log audit events
 * @param action - The action being performed
 */
export const auditLog = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to capture response
      res.json = function(body: any) {
        // Only log if the request was successful (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          // Log the audit event asynchronously
          prisma.auditLog.create({
            data: {
              action,
              details: {
                method: req.method,
                url: req.originalUrl,
                body: req.body,
                response: body
              },
              userId: req.user.id,
              organizationId: req.user.organizationId,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent')
            }
          }).catch(error => {
            console.error('Audit log error:', error);
          });
        }
        
        // Call original json method
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      next();
    }
  };
};