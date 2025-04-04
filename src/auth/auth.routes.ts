// src/routes/auth.routes.ts

import express, { Request, Response } from 'express';
import passport from '../auth/passport';
import { verifyToken } from '../middlewares/auth.middleware';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/user.model';
import Perizia from '../models/perizie.model';

const router = express.Router();

// 🔐 LOGIN CON GOOGLE
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 🔄 CALLBACK DOPO LOGIN
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req: any, res: Response): void => {
    console.log('🔐 req.user dopo login Google:', req.user);

    if (!req.user || !req.user._id) {
      res.status(401).json({ message: 'Autenticazione fallita' });
      return;
    }

    // ✅ Genera il token
    const jwtSecret: string = process.env.JWT_SECRET || 'supersegreto123';
    const jwtOptions: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
    };
    const token = jwt.sign(
      {
        id: req.user._id,
        email: req.user.email,
        googleUsername: req.user.googleUsername,
      },
      jwtSecret,
      jwtOptions
    );

    console.log('📦 TOKEN generato:', jwt.decode(token));

    // ✅ Redirect al frontend con token
    res.redirect(`http://localhost:4200/home?token=${token}`);
  }
);

// ✅ /me → Ritorna dati utente loggato
router.get(
  '/me',
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      console.log('🔍 Token decodificato:', (req as any).user);

      const user = await User.findById(userId);
      console.log('🔍 Utente trovato:', user);

      if (!user) {
        res.status(404).json({ message: 'Utente non trovato' });
        return;
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Errore server', error });
    }
  }
);

router.get(
  '/perizie',
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      console.log('🔍 Token decodificato:', (req as any).user);

      const perizie = await Perizia.find({ codiceOperatore: userId });

      console.log('📄 Perizie trovate:', perizie); // 👈 stampa in console

      if (!perizie || perizie.length === 0) {
        res.json({ perizie: [], nPerizie: 0 });
        return;
      }

      res.json({ perizie, nPerizie: perizie.length });
    } catch (error) {
      console.error('❌ Errore perizie:', error);
      res.status(500).json({ message: 'Errore server', error });
    }
  }
);
  

export default router;
