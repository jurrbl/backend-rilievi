// src/routes/auth.routes.ts
import express, { Request, Response } from 'express';
import passport from '../auth/passport';
import { verifyToken } from '../middlewares/auth.middleware';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/user.model';
import Perizia from '../models/perizie.model';

const router = express.Router();

// 🔐 LOGIN CON GOOGLE
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Genera codice perizia tipo P2042
async function generaCodiceUnivoco(): Promise<string> {
  const count = await Perizia.countDocuments();
  return 'P' + String(2000 + count + 1);
}

// 🔁 CALLBACK dopo login
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req: any, res: Response): void => {
    if (!req.user || !req.user._id) {
      res.status(401).json({ message: 'Autenticazione fallita' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'supersegreto123';
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

    res.redirect(`http://localhost:4200/home?token=${token}`);
  }
);

// ✅ /me → ritorna utente loggato
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'Utente non trovato' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Errore server', error });
  }
});

// ✅ Aggiungi perizia
router.post('/addPerizie', async (req: Request, res: Response) => {
  try {
    const { dataOra, coordinate, descrizione, stato, codiceOperatore } = req.body;
    const codicePerizia = await generaCodiceUnivoco();

    const perizia = new Perizia({
      codicePerizia,
      dataOra,
      coordinate,
      descrizione,
      stato,
      codiceOperatore
    });

    await perizia.save();
    res.status(201).json(perizia);
  } catch (error) {
    res.status(500).json({ message: 'Errore durante il salvataggio della perizia', error });
  }
});

// ✅ Lista perizie dell’utente loggato
router.get('/perizie', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const perizie = await Perizia.find({ codiceOperatore: userId });

    res.json({ perizie, nPerizie: perizie.length });
  } catch (error) {
    res.status(500).json({ message: 'Errore server', error });
  }
});

// ✅ Aggiungi foto a una perizia
router.post('/perizie/:id/foto', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { url, commento } = req.body;

    const perizia = await Perizia.findById(id);
    if (!perizia) {
      res.status(404).json({ message: 'Perizia non trovata' });
      return;
    }

    perizia.fotografie.push({ url, commento });
    await perizia.save();

    res.status(200).json(perizia);
  } catch (error) {
    console.error('Errore salvataggio foto:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio della foto', error });
  }
});

export default router;
