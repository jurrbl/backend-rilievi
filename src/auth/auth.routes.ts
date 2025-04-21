import express, { Request, Response } from 'express';
import passport from '../auth/passport';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { verifyToken } from '../middlewares/auth.middleware';
import User from '../models/user.model';

const router = express.Router();

// 🔐 LOGIN CON GOOGLE
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 🔁 CALLBACK dopo login con Google
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

    // ✅ Imposta cookie HttpOnly
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: false, // ✅ metti true in produzione con HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
    });

    res.redirect('http://localhost:4200/home');
  }
)

// ✅ Dentro AuthService (Angular - frontend)

// ✅ LOGIN CLASSICO (email + password)
router.post('/login', async (req, res): Promise<any> => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password!)))
      return res.status(401).json({ message: 'Email o password errati' });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username || user.googleUsername,
      },
      process.env.JWT_SECRET || 'supersegreto',
      { expiresIn: '7d' }
    );

    // ✅ Salva JWT nel cookie HttpOnly
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: false, // ✅ true in produzione con HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ message: 'Login riuscito' });
  } catch (error) {
    console.error('❌ Errore login:', error);
    res.status(500).json({ message: 'Errore durante il login', error });
  }
});

// ✅ REGISTRAZIONE UTENTE
router.post('/register', async (req, res): Promise<any> => {
  const { username, email, password } = req.body;
  try {
    const esiste = await User.findOne({ email });
    if (esiste) return res.status(400).json({ message: 'Email già registrata' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuovoUtente = new User({ username, email, password: hashedPassword });
    await nuovoUtente.save();

    res.status(201).json({ message: 'Registrazione completata', user: nuovoUtente });
  } catch (error) {
    console.error('❌ Errore registrazione:', error);
    res.status(500).json({ message: 'Errore durante la registrazione', error });
  }
});

// ✅ /me → ritorna utente loggato
router.get('/me', verifyToken, async (req, res): Promise<any> => {
  try {
    const user = await User.findById((req as any).user.id);
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Errore server', error });
  }
});

// ✅ /auth/forgot-password
router.post('/forgot-password', async (req, res): Promise<any> => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Utente non trovato con questa email' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersegreto', { expiresIn: '1h' });
    const resetLink = `http://localhost:4200/reset-password?token=${token}&email=${email}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Supporto Rilievi" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Reset della Password',
      html: `
        <p>Hai richiesto il reset della password.</p>
        <p><a href="${resetLink}">Clicca qui per resettare la tua password</a></p>
        <p>Il link scadrà tra 1 ora.</p>
      `,
    });

    res.status(200).json({ message: 'Email inviata con successo' });
  } catch (error) {
    res.status(500).json({ message: 'Errore invio email', error });
  }
});

// ✅ POST /auth/reset-password
router.post('/reset-password', async (req, res): Promise<any> => {
  const { token, nuovaPassword, email } = req.body;

  if (!token || !email) return res.status(400).json({ message: 'Token o email mancanti' });

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'supersegreto');

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Utente non trovato con questa email' });

    const hashedPassword = await bcrypt.hash(nuovaPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password aggiornata con successo' });
  } catch (err) {
    res.status(500).json({ message: 'Token non valido o scaduto' });
  }
});

// ✅ LOGOUT → elimina il cookie
router.get('/logout', (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: false // true in produzione con HTTPS
  });
  res.status(200).json({ message: 'Logout effettuato con successo' });
});

export default router;
