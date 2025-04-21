import express, { Request, Response } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import Perizia from '../models/perizie.model';
import User from '../models/user.model';
import bcrypt from 'bcryptjs'
import { verifyAdmin } from '../middlewares/auth.middleware';    

const router = express.Router();

// 🛡️ Middleware di controllo ruolo admin
async function isAdmin(req: Request, res: Response, next: any) : Promise <any>    {
  const user = await User.findById((req as any).user.id);
  if (user?.role !== 'admin') return res.status(403).json({ message: 'Accesso negato: solo admin' });
  next();
}


router.get('/utenti', verifyToken, isAdmin, async (req, res) => {
    try {
      const utenti = await User.find(); // senza populate
      const utentiConPerizie = await Promise.all(
        utenti.map(async utente => {
          const perizie = await Perizia.find({ codiceOperatore: utente._id });
          return { ...utente.toObject(), perizie };
        })
      );
      res.json({ utenti: utentiConPerizie });
    } catch (err) {
      console.error('❌ Errore nel recupero utenti:', err);
      res.status(500).json({ error: 'Errore nel recupero utenti' });
    }
  });

  router.get('/utenti-con-perizie', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const utenti = await User.find({ role: 'user' });
  
      // Conta perizie in_corso per ogni utente
      const utentiConConteggio = await Promise.all(
        utenti.map(async utente => {
          const count = await Perizia.countDocuments({
            codiceOperatore: utente._id,
            stato: 'in_corso'
          });
  
          return {
            _id: utente._id,
            username: utente.username,
            email: utente.email,
            profilePicture: utente.profilePicture,
            in_corso_count: count
          };
        })
      );
  
      res.json({ utenti: utentiConConteggio });
    } catch (error) {
      res.status(500).json({ message: 'Errore nel caricamento utenti con perizie', error });
    }
  });
  
  router.post('/users', verifyToken, isAdmin, async (req, res)  : Promise <any> => {
    try {
      const { username, email, password, role } = req.body;
  
      const esiste = await User.findOne({ email });
      if (esiste) return res.status(400).json({ message: 'Email già registrata' });
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const nuovoUtente = new User({
        username,
        email,
        password: hashedPassword,
        role, // 'user' se abilitato, 'viewer' se no
      });
  
      await nuovoUtente.save();
      res.status(201).json({ message: 'Operatore creato con successo', utente: nuovoUtente });
    } catch (error) {
      res.status(500).json({ message: 'Errore creazione utente', error });
    }
  });


  router.get('/perizie/utente/:id', verifyToken, isAdmin, async (req, res) => {
    try {
      const operatoreId = req.params.id;
      const perizie = await Perizia.find({ codiceOperatore: operatoreId });
  
      res.status(200).json({ perizie, nPerizie: perizie.length });
    } catch (error) {
      res.status(500).json({ message: 'Errore caricamento perizie utente', error });
    }
  });


// ✅ Tutte le perizie (per la dashboard admin)
router.get('/perizie', verifyToken, isAdmin, async (req, res) : Promise <any> => {
  try {
    const perizie = await Perizia.find().populate('codiceOperatore');
    res.json({ perizie, nPerizie: perizie.length });
  } catch (error) {
    res.status(500).json({ message: 'Errore caricamento perizie', error });
  }
});

// ✅ Perizie filtrate per operatore
router.get('/perizie/utente/:id', verifyToken, isAdmin, async (req, res) : Promise <any> => {
  try {
    const operatoreId = req.params.id;
    const perizie = await Perizia.find({ codiceOperatore: operatoreId });
    res.json({ perizie, nPerizie: perizie.length });
  } catch (error) {
    res.status(500).json({ message: 'Errore caricamento perizie utente', error });
  }
});

// ✅ Modifica completa perizia (compreso stato, descrizione ecc.)
router.put('/perizie/:id', verifyToken, isAdmin, async (req, res) : Promise <any> => {
  try {
    const { id } = req.params;
    const aggiornamenti = req.body;

    const perizia = await Perizia.findByIdAndUpdate(id, aggiornamenti, { new: true });
    if (!perizia) return res.status(404).json({ message: 'Perizia non trovata' });

    res.status(200).json(perizia);
  } catch (error) {
    res.status(500).json({ message: 'Errore durante aggiornamento', error });
  }
});

// ✅ Elimina qualsiasi perizia
router.delete('/perizie/:id', verifyToken, isAdmin, async (req, res) : Promise <any> => {
  try {
    const { id } = req.params;
    const perizia = await Perizia.findByIdAndDelete(id);
    if (!perizia) return res.status(404).json({ message: 'Perizia non trovata' });

    res.status(200).json({ message: 'Perizia eliminata con successo' });
  } catch (error) {
    res.status(500).json({ message: 'Errore durante eliminazione', error });
  }
});

// ✅ Lista utenti
router.get('/users', verifyToken, isAdmin, async (req, res) : Promise <any> => {
  try {
    const users = await User.find({}, { password: 0 }); // nasconde password
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Errore caricamento utenti', error });
  }
});

// ✅ Crea nuovo utente (admin)
router.post('/users', verifyToken, isAdmin, async (req, res) : Promise <any> => {
  try {
    const { username, email, password, role } = req.body;
    const esiste = await User.findOne({ email });
    if (esiste) return res.status(400).json({ message: 'Email già registrata' });

    const hashedPassword = await require('bcryptjs').hash(password, 10);
    const nuovoUtente = new User({ username, email, password: hashedPassword, role });

    await nuovoUtente.save();
    res.status(201).json(nuovoUtente);
  } catch (error) {
    res.status(500).json({ message: 'Errore creazione utente', error });
  }
});

export default router;
