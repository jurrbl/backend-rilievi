// src/middlewares/auth.middleware.ts
import { RequestHandler } from 'express';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersegreto123';

export const verifyToken: RequestHandler = (req, res, next) => {
  const token = req.cookies?.jwt;

  if (!token) {
    res.status(401).json({ message: 'Token mancante' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
    if (err) {
      res.status(403).json({ message: 'Token non valido' });
      return;
    }

    (req as any).user = decoded;
    next();
  });
};
