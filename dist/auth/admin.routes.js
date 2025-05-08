"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const perizie_model_1 = __importDefault(require("../models/perizie.model"));
const user_model_1 = __importDefault(require("../models/user.model")); // 👈 importa bene l'interfaccia!
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose")); // 👈 assicurati di importare mongoose
const router = express_1.default.Router();
// 🛡️ Middleware di controllo ruolo admin
async function isAdmin(req, res, next) {
    const user = await user_model_1.default.findById(req.user.id);
    if (!user || user.role !== "admin")
        return res.status(403).json({ message: "Accesso negato: solo admin" });
    next();
}
// ✅ Tutte le perizie
router.get("/all-perizie", auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const perizie = await perizie_model_1.default.find();
        res.json({ perizie, nPerizie: perizie.length });
    }
    catch (error) {
        res.status(500).json({ message: "Errore nel recupero perizie", error });
    }
});
// ✅ Lista utenti (normale)
router.get("/utenti", auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const utenti = await user_model_1.default.find();
        const utentiConPerizie = await Promise.all(utenti.map(async (utente) => {
            const perizie = await perizie_model_1.default.find({ codiceOperatore: utente._id });
            return { ...utente.toObject(), perizie };
        }));
        res.json({ utenti: utentiConPerizie });
    }
    catch (err) {
        console.error("❌ Errore nel recupero utenti:", err);
        res.status(500).json({ error: "Errore nel recupero utenti" });
    }
});
// ✅ Utenti con conteggio perizie in corso
router.get("/utenti-con-perizie", auth_middleware_1.verifyAdmin, async (req, res) => {
    try {
        const utenti = await user_model_1.default.find({ role: "user" });
        const utentiConConteggio = await Promise.all(utenti.map(async (utente) => {
            const count = await perizie_model_1.default.countDocuments({
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
        }));
        res.json({ utenti: utentiConConteggio });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Errore nel caricamento utenti con perizie", error });
    }
});
// ✅ Crea nuovo utente
router.post("/users", auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const esiste = await user_model_1.default.findOne({ email });
        if (esiste)
            return res.status(400).json({ message: "Email già registrata" });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const nuovoUtente = new user_model_1.default({
            username,
            email,
            password: hashedPassword,
            role,
        });
        await nuovoUtente.save();
        res.status(201).json({ message: "Utente creato", nuovoUtente });
    }
    catch (error) {
        res.status(500).json({ message: "Errore creazione utente", error });
    }
});
// ✅ Tutte le perizie (populate)
router.get("/perizie", auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const perizie = await perizie_model_1.default.find().populate("codiceOperatore");
        res.json({ perizie, nPerizie: perizie.length });
    }
    catch (error) {
        res.status(500).json({ message: "Errore caricamento perizie", error });
    }
});
// ✅ Perizie di un utente
router.get("/perizie/utente/:id", auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const operatoreId = req.params.id;
        const perizie = await perizie_model_1.default.find({ codiceOperatore: operatoreId });
        res.json({ perizie, nPerizie: perizie.length });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Errore caricamento perizie utente", error });
    }
});
router.put("/perizie/:id", auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { descrizione, coordinate, indirizzo, stato, fotografie, revisioneAdmin, } = req.body;
        console.log("Roba ricevuta:\n\n\n\n\n\n", req.body);
        const perizia = await perizie_model_1.default.findById(id);
        if (!perizia)
            return res.status(404).json({ message: "Perizia non trovata" });
        if (descrizione !== undefined)
            perizia.descrizione = descrizione;
        if (coordinate !== undefined)
            perizia.coordinate = coordinate;
        if (indirizzo !== undefined)
            perizia.indirizzo = indirizzo;
        if (stato !== undefined)
            perizia.stato = stato;
        if (fotografie !== undefined)
            perizia.fotografie = fotografie;
        const adminUser = await user_model_1.default.findById(req.user.id);
        if (adminUser && adminUser.role === "admin") {
            perizia.revisioneAdmin = {
                id: new mongoose_1.default.Types.ObjectId(adminUser._id.toString()),
                username: adminUser.username,
                profilePicture: adminUser.profilePicture || "",
                commento: revisioneAdmin?.commento || "", // 🔥 Prendi commento da revisioneAdmin.commento!
            };
            perizia.dataRevisione = new Date();
        }
        await perizia.save();
        res.status(200).json({ message: "Perizia aggiornata", perizia });
    }
    catch (error) {
        console.error("❌ Errore aggiornamento perizia:", error);
        res.status(500).json({ message: "Errore aggiornamento perizia", error });
    }
});
// ✅ Elimina perizia
router.delete("/perizie/:id", auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const perizia = await perizie_model_1.default.findByIdAndDelete(id);
        if (!perizia)
            return res.status(404).json({ message: "Perizia non trovata" });
        res.status(200).json({ message: "Perizia eliminata con successo" });
    }
    catch (error) {
        res.status(500).json({ message: "Errore durante eliminazione", error });
    }
});
// ✅ Lista utenti semplice
router.post("/users", auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        console.log("🔔 POST /admin/users body:", req.body);
        // Controllo esistenza email
        const esiste = await user_model_1.default.findOne({ email });
        if (esiste) {
            return res.status(400).json({ message: "Email già registrata" });
        }
        // Hash della password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Creazione utente
        const nuovoUtente = new user_model_1.default({
            username,
            email,
            password: hashedPassword,
            role,
        });
        await nuovoUtente.save();
        // Risposta di successo
        return res.status(201).json({ message: "Utente creato", nuovoUtente });
    }
    catch (err) {
        // Log completo dell’errore
        console.error("❌ Errore creazione utente:", err);
        if (err instanceof Error) {
            console.error(err.stack);
        }
        const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
        return res.status(500).json({
            message: "Errore creazione utente",
            error: errorMessage,
        });
    }
});
exports.default = router;
