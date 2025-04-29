"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const perizie_model_1 = __importDefault(require("../models/perizie.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const router = express_1.default.Router();
router.get('/perizie', auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const perizie = await perizie_model_1.default.find({ codiceOperatore: userId });
        res.json({ perizie, nPerizie: perizie.length });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore server', error });
    }
});
router.get('/users', auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const utenti = await user_model_1.default.find({ role: 'user' }).select('-password');
        res.json(utenti);
    }
    catch (error) {
        res.status(500).json({ message: 'Errore nel recupero utenti', error });
    }
});
// ✅ Aggiungi nuova perizia
router.post('/perizie', auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const { dataOra, coordinate, descrizione, indirizzo } = req.body;
        const codicePerizia = await generaCodiceUnivoco();
        const codiceOperatore = req.user.id;
        const perizia = new perizie_model_1.default({
            codicePerizia,
            dataOra,
            coordinate,
            descrizione,
            indirizzo,
            stato: 'in_corso',
            codiceOperatore,
            fotografie: []
        });
        await perizia.save();
        res.status(201).json(perizia);
    }
    catch (error) {
        res.status(500).json({ message: 'Errore durante il salvataggio della perizia', error });
    }
});
// ✅ Aggiungi foto a una perizia
router.post('/perizie/:id/foto', auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { url, commento } = req.body;
        const perizia = await perizie_model_1.default.findById(id);
        if (!perizia)
            return res.status(404).json({ message: 'Perizia non trovata' });
        perizia.fotografie.push({ url, commento });
        await perizia.save();
        res.status(200).json(perizia);
    }
    catch (error) {
        res.status(500).json({ message: 'Errore durante il salvataggio della foto', error });
    }
});
// ✅ Modifica perizia (solo descrizione, indirizzo, coordinate)
router.put('/perizie/:id', auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { descrizione, indirizzo, coordinate } = req.body;
        const perizia = await perizie_model_1.default.findById(id);
        if (!perizia)
            return res.status(404).json({ message: 'Perizia non trovata' });
        if (descrizione !== undefined)
            perizia.descrizione = descrizione;
        if (indirizzo !== undefined)
            perizia.indirizzo = indirizzo;
        if (coordinate !== undefined)
            perizia.coordinate = coordinate;
        const aggiornata = await perizia.save();
        res.status(200).json(aggiornata);
    }
    catch (error) {
        res.status(500).json({ message: 'Errore durante l\'aggiornamento della perizia', error });
    }
});
// ✅ Elimina perizia (solo se "in_corso", logica da gestire lato frontend)
router.delete('/perizie/:id', auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const perizia = await perizie_model_1.default.findByIdAndDelete(id);
        if (!perizia)
            return res.status(404).json({ message: 'Perizia non trovata' });
        res.status(200).json({ message: 'Perizia eliminata con successo' });
    }
    catch (error) {
        res.status(500).json({ message: 'Errore durante l\'eliminazione della perizia', error });
    }
});
// 🎲 Funzione codice univoco
async function generaCodiceUnivoco() {
    let codice;
    let esiste;
    do {
        const anno = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        codice = `P${anno}${random}`;
        esiste = !!(await perizie_model_1.default.findOne({ codicePerizia: codice }));
    } while (esiste);
    return codice;
}
exports.default = router;
