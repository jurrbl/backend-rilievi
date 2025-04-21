import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.jwt;

  if (!token) {
    res.status(401).json({ message: 'Token mancante' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as any;
    (req as any).user = decoded;
    next(); // ✅ prosegui se il token è valido
  } catch (err) {
    res.status(403).json({ message: 'Token non valido' });
  }
};

// 🛡️ Middleware per proteggere rotte admin
export const verifyAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies?.jwt;

  if (!token) {
    res.status(401).json({ message: 'Token mancante' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as any;
    (req as any).user = decoded;

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(404).json({ message: 'Utente non trovato' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ message: 'Accesso negato: solo admin' });
      return;
    }

    next();
  } catch (err) {
    res.status(403).json({ message: 'Token non valido' });
  }
};
