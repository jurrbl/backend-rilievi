// src/middlewares/auth.middleware.ts

import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Middleware per proteggere le route
export const verifyToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token mancante o non valido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email?: string };
    console.log('🔍 Token decodificato:', decoded);
    (req as any).user = decoded; // oppure definisci un'interfaccia estesa
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token non valido' });
  }
};
