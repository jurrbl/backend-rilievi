import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

// Middleware standard per verificare il token
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.jwt;

  if (!token) return res.status(401).json({ message: 'Token mancante' });

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ message: 'Token non valido' });

    req.user = decoded;
    next();
  });
};

// 🛡️ Middleware per proteggere rotte admin
export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.jwt;

  if (!token) return res.status(401).json({ message: 'Token mancante' });

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ message: 'Token non valido' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Accesso negato: solo per admin' });
    }

    req.user = decoded;
    next();
  });
};
