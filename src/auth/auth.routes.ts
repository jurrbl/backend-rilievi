// src/routes/auth.routes.ts
import express, { Request, Response } from 'express';
import passport from '../auth/passport';
import { verifyToken } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import Perizia from '../models/perizie.model';
import nodemailer from 'nodemailer';

const router = express.Router();

// 🔐 LOGIN CON GOOGLE
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

router.get('/google/callback', passport.authenticate('google', { session: false }), (async (req: any, res: Response) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'Autenticazione fallita' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'supersegreto123';
  const token = jwt.sign({
    id: req.user._id,
    email: req.user.email,
    googleUsername: req.user.googleUsername,
  }, jwtSecret, { expiresIn: '7d' });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect('http://localhost:4200/home');
}));

// ✅ LOGIN TRADIZIONALE
router.post('/login', (async (req, res) : Promise<any> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email e password obbligatorie' });

    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ message: 'Credenziali non valide' });

    const bcrypt = await import('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Credenziali non valide' });

    const token = jwt.sign({
      id: user._id,
      email: user.email,
      username: user.username,
    }, process.env.JWT_SECRET || 'supersegreto123', { expiresIn: '7d' });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ message: 'Login riuscito', user });
  } catch (err) {
    console.error('Errore login:', err);
    res.status(500).json({ message: 'Errore durante il login' });
  }
}));

// ✅ /me
router.get('/me', verifyToken, (async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Errore server', error });
  }
}));

// ✅ LOGOUT
router.post('/logout', (async (_req: Request, res: Response) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  });
  res.status(200).json({ message: 'Logout eseguito con successo' });
}));

// ✅ REGISTER
router.post('/register', (async (req: Request, res: Response) : Promise<any> => {
  try {
    const { username, email, password, profilePicture } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Compila tutti i campi' });
    }

    const existingEmail = await User.findOne({ email });
    const existingUsername = await User.findOne({ username });
    if (existingEmail) return res.status(409).json({ message: 'Email già registrata' });
    if (existingUsername) return res.status(409).json({ message: 'Username già registrato' });

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      profilePicture,
    });

    await newUser.save();

    const token = jwt.sign({
      id: newUser._id,
      email: newUser.email,
      username: newUser.username
    }, process.env.JWT_SECRET || 'supersegreto123', { expiresIn: '7d' });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({ message: 'Registrazione completata', user: newUser });
  } catch (err) {
    console.error('❌ Errore registrazione:', err);
    res.status(500).json({ message: 'Errore durante la registrazione' });
  }
}));

// ✅ FORGOT PASSWORD
router.post('/forgot-password', (async (req: Request, res: Response) : Promise<any> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email non trovata' });

    const newPassword = Math.random().toString(36).slice(-8);
    const bcrypt = await import('bcrypt');
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: 'Rilievi & Perizie <noreply@rilievi.it>',
      to: email,
      subject: '🔐 Nuova password temporanea',
      text: `La tua nuova password è: ${newPassword}`,
    });

    res.status(200).json({ message: 'Email inviata con nuova password' });
  } catch (error) {
    console.error('Errore invio email:', error);
    res.status(500).json({ message: 'Errore invio email' });
  }
}));

// ✅ Aggiunta perizia
router.post('/addPerizie', (async (req: Request, res: Response) => {
  try {
    const { dataOra, coordinate, descrizione, stato, codiceOperatore } = req.body;
    const codicePerizia = await generaCodiceUnivoco();

    const perizia = new Perizia({ codicePerizia, dataOra, coordinate, descrizione, stato, codiceOperatore });
    await perizia.save();

    res.status(201).json(perizia);
  } catch (error) {
    res.status(500).json({ message: 'Errore durante il salvataggio della perizia', error });
  }
}));

// ✅ Lista perizie
router.get('/perizie', verifyToken, (async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const perizie = await Perizia.find({ codiceOperatore: userId });
    res.json({ perizie, nPerizie: perizie.length });
  } catch (error) {
    res.status(500).json({ message: 'Errore server', error });
  }
}));

// ✅ Aggiunta foto
router.post('/perizie/:id/foto', (async (req: Request, res: Response) : Promise<any> => {
  try {
    const { id } = req.params;
    const { url, commento } = req.body;

    const perizia = await Perizia.findById(id);
    if (!perizia) {
      return res.status(404).json({ message: 'Perizia non trovata' });
    }

    perizia.fotografie.push({ url, commento });
    await perizia.save();

    res.status(200).json(perizia);
  } catch (error) {
    console.error('Errore salvataggio foto:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio della foto', error });
  }
}));

// 📌 Codice perizia
async function generaCodiceUnivoco(): Promise<string> {
  const count = await Perizia.countDocuments();
  return 'P' + String(2000 + count + 1);
}

export default router;
