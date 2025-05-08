import express, { Request, Response } from "express";
import { verifyToken, verifyAdmin } from "../middlewares/auth.middleware";
import Perizia from "../models/perizie.model";
import User, { IUser } from "../models/user.model"; // 👈 importa bene l'interfaccia!
import bcrypt from "bcryptjs";
import mongoose from "mongoose"; // 👈 assicurati di importare mongoose
const router = express.Router();

// 🛡️ Middleware di controllo ruolo admin
async function isAdmin(req: Request, res: Response, next: any): Promise<any> {
  const user = await User.findById((req as any).user.id);
  if (!user || user.role !== "admin")
    return res.status(403).json({ message: "Accesso negato: solo admin" });
  next();
}

// ✅ Tutte le perizie
router.get(
  "/all-perizie",
  verifyToken,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const perizie = await Perizia.find();
      res.json({ perizie, nPerizie: perizie.length });
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero perizie", error });
    }
  }
);

// ✅ Lista utenti (normale)
router.get("/utenti", verifyToken, isAdmin, async (req, res) => {
  try {
    const utenti = await User.find();
    const utentiConPerizie = await Promise.all(
      utenti.map(async (utente) => {
        const perizie = await Perizia.find({ codiceOperatore: utente._id });
        return { ...utente.toObject(), perizie };
      })
    );
    res.json({ utenti: utentiConPerizie });
  } catch (err) {
    console.error("❌ Errore nel recupero utenti:", err);
    res.status(500).json({ error: "Errore nel recupero utenti" });
  }
});

// ✅ Utenti con conteggio perizie in corso
router.get(
  "/utenti-con-perizie",
  verifyAdmin,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const utenti = await User.find({ role: "user" });

      const utentiConConteggio = await Promise.all(
        utenti.map(async (utente) => {
          const count = await Perizia.countDocuments({
            codiceOperatore: utente._id,
            stato: "in_corso",
          });
          return {
            _id: utente._id,
            username: utente.username,
            email: utente.email,
            profilePicture: utente.profilePicture,
            in_corso_count: count,
          };
        })
      );

      res.json({ utenti: utentiConConteggio });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Errore nel caricamento utenti con perizie", error });
    }
  }
);

// ✅ Crea nuovo utente
router.post("/users", verifyToken, isAdmin, async (req, res): Promise<any> => {
  try {
    const { username, email, password, role } = req.body;

    const esiste = await User.findOne({ email });
    if (esiste)
      return res.status(400).json({ message: "Email già registrata" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuovoUtente = new User({
      username,
      email,
      password: hashedPassword,
      role,
    });
    await nuovoUtente.save();

    res.status(201).json({ message: "Utente creato", nuovoUtente });
  } catch (error) {
    res.status(500).json({ message: "Errore creazione utente", error });
  }
});

// ✅ Tutte le perizie (populate)
router.get("/perizie", verifyToken, isAdmin, async (req, res): Promise<any> => {
  try {
    const perizie = await Perizia.find().populate("codiceOperatore");
    res.json({ perizie, nPerizie: perizie.length });
  } catch (error) {
    res.status(500).json({ message: "Errore caricamento perizie", error });
  }
});

// ✅ Perizie di un utente
router.get(
  "/perizie/utente/:id",
  verifyToken,
  isAdmin,
  async (req, res): Promise<any> => {
    try {
      const operatoreId = req.params.id;
      const perizie = await Perizia.find({ codiceOperatore: operatoreId });
      res.json({ perizie, nPerizie: perizie.length });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Errore caricamento perizie utente", error });
    }
  }
);

router.put(
  "/perizie/:id",
  verifyToken,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const {
        descrizione,
        coordinate,
        indirizzo,
        stato,
        fotografie,
        revisioneAdmin,
      } = req.body;
      console.log("Roba ricevuta:\n\n\n\n\n\n", req.body);
      const perizia = await Perizia.findById(id);
      if (!perizia)
        return res.status(404).json({ message: "Perizia non trovata" });

      if (descrizione !== undefined) perizia.descrizione = descrizione;
      if (coordinate !== undefined) perizia.coordinate = coordinate;
      if (indirizzo !== undefined) perizia.indirizzo = indirizzo;
      if (stato !== undefined) perizia.stato = stato;
      if (fotografie !== undefined) perizia.fotografie = fotografie;

      const adminUser = await User.findById((req as any).user.id);
      if (adminUser && adminUser.role === "admin") {
        perizia.revisioneAdmin = {
          id: new mongoose.Types.ObjectId((adminUser._id as any).toString()),
          username: adminUser.username,
          profilePicture: adminUser.profilePicture || "",
          commento: revisioneAdmin?.commento || "", // 🔥 Prendi commento da revisioneAdmin.commento!
        };
        perizia.dataRevisione = new Date();
      }

      await perizia.save();
      res.status(200).json({ message: "Perizia aggiornata", perizia });
    } catch (error) {
      console.error("❌ Errore aggiornamento perizia:", error);
      res.status(500).json({ message: "Errore aggiornamento perizia", error });
    }
  }
);

// ✅ Elimina perizia
router.delete(
  "/perizie/:id",
  verifyToken,
  isAdmin,
  async (req, res): Promise<any> => {
    try {
      const { id } = req.params;
      const perizia = await Perizia.findByIdAndDelete(id);
      if (!perizia)
        return res.status(404).json({ message: "Perizia non trovata" });

      res.status(200).json({ message: "Perizia eliminata con successo" });
    } catch (error) {
      res.status(500).json({ message: "Errore durante eliminazione", error });
    }
  }
);

// ✅ Lista utenti semplice
router.post(
  "/users",
  verifyToken,
  isAdmin,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { username, email, password, role } = req.body;

      console.log("🔔 POST /admin/users body:", req.body);

      // Controllo esistenza email
      const esiste = await User.findOne({ email });
      if (esiste) {
        return res.status(400).json({ message: "Email già registrata" });
      }

      // Hash della password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Creazione utente
      const nuovoUtente = new User({
        username,
        email,
        password: hashedPassword,
        role,
      });
      await nuovoUtente.save();

      // Risposta di successo
      return res.status(201).json({ message: "Utente creato", nuovoUtente });
    } catch (err) {
      // Log completo dell’errore
      console.error("❌ Errore creazione utente:", err);
      if (err instanceof Error) {
        console.error(err.stack);
      }

      const errorMessage =
        err instanceof Error ? err.message : "Errore sconosciuto";

      return res.status(500).json({
        message: "Errore creazione utente",
        error: errorMessage,
      });
    }
  }
);

export default router;
