
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
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
  
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

    // ✅ Genera il token con tipi corretti
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

    // ✅ Redirect con token al frontend
    /* res.json({ token, user: req.user }); */
    res.redirect(`http://localhost:4200/home?token=${token}`);
  }
);

// ✅ ROUTE PROTETTA /me PER OTTENERE I DATI UTENTE
router.get(
  '/me',
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      
      console.log('🔍 Token decodificato:', (req as any).user);

      const user = await User.findById(userId)
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

// Perizie
router.get('/perizie', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    console.log(userId)
    console.log('🔍 userId:', userId);
    console.log('🧠 Utente loggato:', req.user);

    const perizie = await Perizia.find({ codiceOperatore: userId }).populate('codiceOperatore');


    console.log('📦 Perizie trovate:', );

    res.json({
      perizie,
      message: 'Perizie trovate con successo',
    });
  } catch (error) {
    console.error('❌ Errore perizie:', error);
    res.status(500).json({ message: 'Errore server', error });
  }
});




export default router;
