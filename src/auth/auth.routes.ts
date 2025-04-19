// src/routes/auth.routes.ts
import express, { Request, Response } from 'express';
import passport from '../auth/passport';
import { verifyToken } from '../middlewares/auth.middleware';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/user.model';
import Perizia from '../models/perizie.model';
import nodemailer from 'nodemailer';


import bcrypt from 'bcryptjs';
const router = express.Router();

// 🔐 LOGIN CON GOOGLE
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Genera codice perizia tipo P2042
async function generaCodiceUnivoco(): Promise<string> {
  let codice: string;
  let esiste: boolean;

  do {
    // Esempio: codice tipo P2025
    const anno = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    codice = `P${anno}${random}`;

    const periziaEsistente = await Perizia.findOne({ codicePerizia: codice });
    esiste = !!periziaEsistente;
  } while (esiste);

  return codice;
}
// ✅ REGISTRAZIONE UTENTE
router.post('/register', async (req, res): Promise<any> => {
  const { username, email, password } = req.body;
  console.log('📥 Dati ricevuti per la registrazione:', req.body); // <-- LOG

  try {
    const esiste = await User.findOne({ email });
    if (esiste) {
      return res.status(400).json({ message: 'Email già registrata' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuovoUtente = new User({ username, email, password: hashedPassword });

    await nuovoUtente.save();

    res.status(201).json({ message: 'Registrazione completata', user: nuovoUtente });
  } catch (error) {
    console.error('❌ Errore registrazione backend:', error); // <-- LOG
    res.status(500).json({ message: 'Errore durante la registrazione', error });
  }
});

// ✅ LOGIN CLASSICO
router.post('/login', async (req: Request, res: Response) : Promise <any> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email o password errati' });
    }

    const match = await bcrypt.compare(password, user.password!);
    if (!match) {
      return res.status(401).json({ message: 'Email o password errati' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username || user.googleUsername,
      },
      process.env.JWT_SECRET || 'supersegreto',
      { expiresIn: '7d' }
    );

    res.status(200).json({ token, user });
  } catch (error) {
    console.error('❌ Errore login:', error);
    res.status(500).json({ message: 'Errore durante il login', error });
  }
});



// ✅ POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<any> => {
  const { token, nuovaPassword, email } = req.body;

  if (!token || !email) {
    return res.status(400).json({ message: 'Token o email mancanti' });
  }

  try {
    // ✅ Verifica che il token sia valido (anche se non contiene dati utente)
    jwt.verify(token, process.env.JWT_SECRET || 'supersegreto');

    // ✅ Cerca utente tramite email fornita nel link
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato con questa email' });
    }

    // ✅ Hash nuova password
    const hashedPassword = await bcrypt.hash(nuovaPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.status(200).json({ message: 'Password aggiornata con successo' });
  } catch (err) {
    console.error('Errore durante il reset password:', err);
    res.status(500).json({ message: 'Token non valido o scaduto' });
  }
});




// ✅ /auth/forgot-password
router.post('/forgot-password', async (req, res): Promise<any> => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Utente non trovato con questa email' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersegreto', {
      expiresIn: '1h'
    });

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
    console.error('Errore invio email:', error);
    res.status(500).json({ message: 'Errore interno', error });
  }
});



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
    console.log('BODY RICEVUTO:', req.body); // 👈 debug utile
    const { dataOra, coordinate, descrizione, indirizzo, codiceOperatore } = req.body;
    const codicePerizia = await generaCodiceUnivoco();

    const perizia = new Perizia({
      codicePerizia,
      dataOra,
      coordinate,
      descrizione,
      stato: "in_corso",
      indirizzo,
      codiceOperatore,
      fotografie: []
    });

    await perizia.save();
    res.status(201).json(perizia);
  } catch (error) {
    console.error('❌ Errore salvataggio:', error); // 👈 stampalo
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

/* PUT /auth/perizie/:id */

router.put('/perizie/:id', async (req: Request, res: Response) : Promise <any> => {
  try {
    const { id } = req.params;
    const { descrizione, indirizzo, coordinate } = req.body;

    const perizia = await Perizia.findById(id);
    if (!perizia) {
      return res.status(404).json({ message: 'Perizia non trovata' });
    }

    // ✅ Aggiorna i campi modificabili
    if (descrizione !== undefined) perizia.descrizione = descrizione;
    if (indirizzo !== undefined) perizia.indirizzo = indirizzo;
    if (coordinate !== undefined) perizia.coordinate = coordinate;

    const aggiornata = await perizia.save();
    res.status(200).json(aggiornata);

  } catch (error) {
    console.error('Errore aggiornamento perizia:', error);
    res.status(500).json({ message: 'Errore durante l\'aggiornamento della perizia', error });
  }
});


// ✅ Elimina perizia
router.delete('/perizie/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('ID perizia da eliminare:', id);
    const perizia = await Perizia.findByIdAndDelete(id);
    if (!perizia) {
      res.status(404).json({ message: 'Perizia non trovata' });
      return;
    }
    res.status(200).json({ message: 'Perizia eliminata con successo' });
  } catch (error) {
    console.error('Errore eliminazione perizia:', error);
    res.status(500).json({ message: 'Errore durante l\'eliminazione della perizia', error });
  }
}

);


router.get('/logout', (req, res) => {
  res.clearCookie('jwt'); // solo se salvi JWT in cookie HttpOnly
  res.status(200).json({ message: 'Logout effettuato con successo' });
});


export default router;
