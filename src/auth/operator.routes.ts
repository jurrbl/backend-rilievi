    import express, { Request, Response } from 'express';
    import { verifyToken } from '../middlewares/auth.middleware';
    import Perizia from '../models/perizie.model';
    import User from '../models/user.model'
    
    const router = express.Router();

    router.get('/perizie', verifyToken, async (req: Request, res: Response): Promise <any> => {
      try {
        const userId = (req as any).user.id;
        const perizie = await Perizia.find({ codiceOperatore: userId }).select('codicePerizia dataOra coordinate indirizzo descrizione stato fotografie revisioneAdmin')        ;
        res.json({ perizie, nPerizie: perizie.length });
      } catch (error) {
        res.status(500).json({ message: 'Errore server', error });
      }
    });


router.get('/users', verifyToken, async (req: Request, res: Response) => {
    try {
      const utenti = await User.find({ role: 'user' }).select('-password');
      res.json(utenti);
    } catch (error) {
      res.status(500).json({ message: 'Errore nel recupero utenti', error });
    }
  });
    
    // ✅ Aggiungi nuova perizia
    router.post('/perizie', verifyToken, async (req: Request, res: Response): Promise <any> => {
      try {
        const { dataOra, coordinate, descrizione, indirizzo } = req.body;
    
        const codicePerizia = await generaCodiceUnivoco();
        const codiceOperatore = (req as any).user.id;
    
        const perizia = new Perizia({
          codicePerizia,
          dataOra,
          coordinate,
          descrizione,
          revisioneAdmin : 'In Attesa Di Revisione',
          indirizzo,
          stato: 'in_corso',
          codiceOperatore,
          fotografie: []
        });
    
        await perizia.save();
        res.status(201).json(perizia);
      } catch (error) {
        res.status(500).json({ message: 'Errore durante il salvataggio della perizia', error });
      }
    });
    
    // ✅ Aggiungi foto a una perizia
    router.post('/perizie/:id/foto', verifyToken, async (req: Request, res: Response): Promise <any> => {
      try {
        const { id } = req.params;
        const { url, commento } = req.body;
    
        const perizia = await Perizia.findById(id);
        if (!perizia) return res.status(404).json({ message: 'Perizia non trovata' });
    
        perizia.fotografie.push({ url, commento });
        await perizia.save();
    
        res.status(200).json(perizia);
      } catch (error) {
        res.status(500).json({ message: 'Errore durante il salvataggio della foto', error });
      }
    });
    
    // ✅ Modifica perizia (solo descrizione, indirizzo, coordinate)
    router.put('/perizie/:id', verifyToken, async (req: Request, res: Response): Promise<any> => {
      try {
        const { id } = req.params;
        const { descrizione, indirizzo, coordinate, revisioneAdmin } = req.body;
    
        const perizia = await Perizia.findById(id);
        if (!perizia) return res.status(404).json({ message: 'Perizia non trovata' });
    
        if (descrizione !== undefined) perizia.descrizione = descrizione;
        if (indirizzo !== undefined) perizia.indirizzo = indirizzo;
        if (coordinate !== undefined) perizia.coordinate = coordinate;
    
        // ✅ Salva il commento dell'admin separato
        if (revisioneAdmin !== undefined) perizia.revisioneAdmin = revisioneAdmin;
    
        const aggiornata = await perizia.save();
        res.status(200).json(aggiornata);
      } catch (error) {
        res.status(500).json({ message: 'Errore durante l\'aggiornamento della perizia', error });
      }
    });
    
    // ✅ Elimina perizia (solo se "in_corso", logica da gestire lato frontend)
    router.delete('/perizie/:id', verifyToken, async (req: Request, res: Response): Promise <any> => {
      try {
        const { id } = req.params;
        const perizia = await Perizia.findByIdAndDelete(id);
        if (!perizia) return res.status(404).json({ message: 'Perizia non trovata' });
    
        res.status(200).json({ message: 'Perizia eliminata con successo' });
      } catch (error) {
        res.status(500).json({ message: 'Errore durante l\'eliminazione della perizia', error });
      }
    });
    
    // 🎲 Funzione codice univoco
    async function generaCodiceUnivoco(): Promise<string> {
      let codice: string;
      let esiste: boolean;
    
      do {
        const anno = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        codice = `P${anno}${random}`;
        esiste = !!(await Perizia.findOne({ codicePerizia: codice }));
      } while (esiste);
    
      return codice;
    }
    
    export default router;
    