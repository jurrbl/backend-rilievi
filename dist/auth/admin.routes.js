"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const perizie_model_1 = __importDefault(require("../models/perizie.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_2 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
// 🛡️ Middleware di controllo ruolo admin
async function isAdmin(req, res, next) {
    const user = await user_model_1.default.findById(req.user.id);
    if (user?.role !== 'admin')
        return res.status(403).json({ message: 'Accesso negato: solo admin' });
    next();
}
router.get('/all-perizie', auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const perizie = await perizie_model_1.default.find(); // tutte le perizie
        res.json({ perizie, nPerizie: perizie.length });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore nel recupero perizie', error });
    }
});
router.get('/utenti', auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const utenti = await user_model_1.default.find(); // senza populate
        const utentiConPerizie = await Promise.all(utenti.map(async (utente) => {
            const perizie = await perizie_model_1.default.find({ codiceOperatore: utente._id });
            return { ...utente.toObject(), perizie };
        }));
        res.json({ utenti: utentiConPerizie });
    }
    catch (err) {
        console.error('❌ Errore nel recupero utenti:', err);
        res.status(500).json({ error: 'Errore nel recupero utenti' });
    }
});
router.get('/utenti-con-perizie', auth_middleware_2.verifyAdmin, async (req, res) => {
    try {
        const utenti = await user_model_1.default.find({ role: 'user' });
        // Conta perizie in_corso per ogni utente
        const utentiConConteggio = await Promise.all(utenti.map(async (utente) => {
            const count = await perizie_model_1.default.countDocuments({
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
        }));
        res.json({ utenti: utentiConConteggio });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore nel caricamento utenti con perizie', error });
    }
});
router.post('/users', auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const esiste = await user_model_1.default.findOne({ email });
        if (esiste)
            return res.status(400).json({ message: 'Email già registrata' });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const nuovoUtente = new user_model_1.default({
            username,
            email,
            password: hashedPassword,
            role, // 'user' se abilitato, 'viewer' se no
        });
        await nuovoUtente.save();
        res.status(201).json({ message: 'Operatore creato con successo', utente: nuovoUtente });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore creazione utente', error });
    }
});
router.get('/perizie/utente/:id', auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const operatoreId = req.params.id;
        const perizie = await perizie_model_1.default.find({ codiceOperatore: operatoreId });
        res.status(200).json({ perizie, nPerizie: perizie.length });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore caricamento perizie utente', error });
    }
});
// ✅ Tutte le perizie (per la dashboard admin)
router.get('/perizie', auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const perizie = await perizie_model_1.default.find().populate('codiceOperatore');
        res.json({ perizie, nPerizie: perizie.length });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore caricamento perizie', error });
    }
});
// ✅ Perizie filtrate per operatore
router.get('/perizie/utente/:id', auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const operatoreId = req.params.id;
        const perizie = await perizie_model_1.default.find({ codiceOperatore: operatoreId });
        res.json({ perizie, nPerizie: perizie.length });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore caricamento perizie utente', error });
    }
});
// ✅ Modifica completa perizia (compreso stato, descrizione ecc.)
router.put('/perizie/:id', auth_middleware_1.verifyToken, async (req, res) => {
    console.log('PUT /perizie/:id BODY:', req.body);
    try {
        const { id } = req.params;
        const { descrizione, coordinate, indirizzo, stato, fotografie } = req.body;
        const perizia = await perizie_model_1.default.findById(id);
        if (!perizia)
            return res.status(404).json({ message: 'Perizia non trovata' });
        if (descrizione !== undefined)
            perizia.descrizione = descrizione;
        if (coordinate !== undefined)
            perizia.coordinate = coordinate;
        if (indirizzo !== undefined)
            perizia.indirizzo = indirizzo;
        if (fotografie !== undefined)
            perizia.fotografie = fotografie;
        if (stato !== undefined)
            perizia.stato = stato;
        await perizia.save();
        res.json({ message: 'Perizia aggiornata', perizia });
    }
    catch (error) {
        console.error('❌ ERRORE BACKEND:', error);
        res.status(500).json({ message: 'Errore durante l\'aggiornamento', error });
    }
});
// ✅ Elimina qualsiasi perizia
router.delete('/perizie/:id', auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const perizia = await perizie_model_1.default.findByIdAndDelete(id);
        if (!perizia)
            return res.status(404).json({ message: 'Perizia non trovata' });
        res.status(200).json({ message: 'Perizia eliminata con successo' });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore durante eliminazione', error });
    }
});
// ✅ Lista utenti
router.get('/users', auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await user_model_1.default.find({}, { password: 0 }); // nasconde password
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Errore caricamento utenti', error });
    }
});
// ✅ Crea nuovo utente (admin)
router.post('/users', auth_middleware_1.verifyToken, isAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const esiste = await user_model_1.default.findOne({ email });
        if (esiste)
            return res.status(400).json({ message: 'Email già registrata' });
        const hashedPassword = await require('bcryptjs').hash(password, 10);
        const nuovoUtente = new user_model_1.default({ username, email, password: hashedPassword, role });
        await nuovoUtente.save();
        res.status(201).json(nuovoUtente);
    }
    catch (error) {
        res.status(500).json({ message: 'Errore creazione utente', error });
    }
});
exports.default = router;
