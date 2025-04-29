"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("../auth/passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const user_model_1 = __importDefault(require("../models/user.model"));
const router = express_1.default.Router();
// 🔐 LOGIN CON GOOGLE
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
// 🔁 CALLBACK dopo login con Google
router.get('/google/callback', passport_1.default.authenticate('google', { session: false }), (req, res) => {
    if (!req.user || !req.user._id) {
        res.status(401).json({ message: 'Autenticazione fallita' });
        return;
    }
    const jwtSecret = process.env.JWT_SECRET || 'supersegreto123';
    const jwtOptions = {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d'),
    };
    const token = jsonwebtoken_1.default.sign({
        id: req.user._id,
        email: req.user.email,
        googleUsername: req.user.googleUsername,
    }, jwtSecret, jwtOptions);
    // ✅ Imposta cookie HttpOnly
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: false, // ✅ metti true in produzione con HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
    });
    res.redirect('http://localhost:4200/home');
});
// ✅ Dentro AuthService (Angular - frontend)
// ✅ LOGIN CLASSICO (email + password)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await user_model_1.default.findOne({ email });
        if (!user || !(await bcryptjs_1.default.compare(password, user.password)))
            return res.status(401).json({ message: 'Email o password errati' });
        const token = jsonwebtoken_1.default.sign({
            id: user._id,
            email: user.email,
            username: user.username || user.googleUsername,
        }, process.env.JWT_SECRET || 'supersegreto', { expiresIn: '7d' });
        // ✅ Salva JWT nel cookie HttpOnly
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: false, // ✅ true in produzione con HTTPS
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(200).json({ message: 'Login riuscito' });
    }
    catch (error) {
        console.error('❌ Errore login:', error);
        res.status(500).json({ message: 'Errore durante il login', error });
    }
});
// ✅ REGISTRAZIONE UTENTE
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const esiste = await user_model_1.default.findOne({ email });
        if (esiste)
            return res.status(400).json({ message: 'Email già registrata' });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const nuovoUtente = new user_model_1.default({ username, email, password: hashedPassword });
        await nuovoUtente.save();
        res.status(201).json({ message: 'Registrazione completata', user: nuovoUtente });
    }
    catch (error) {
        console.error('❌ Errore registrazione:', error);
        res.status(500).json({ message: 'Errore durante la registrazione', error });
    }
});
// ✅ /me → ritorna utente loggato
router.get('/me', auth_middleware_1.verifyToken, async (req, res) => {
    try {
        const user = await user_model_1.default.findById(req.user.id);
        if (!user)
            return res.status(404).json({ message: 'Utente non trovato' });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Errore server', error });
    }
});
// ✅ /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await user_model_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: 'Utente non trovato con questa email' });
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'supersegreto', { expiresIn: '1h' });
        const resetLink = `http://localhost:4200/reset-password?token=${token}&email=${email}`;
        const transporter = nodemailer_1.default.createTransport({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Errore invio email', error });
    }
});
// ✅ POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { token, nuovaPassword, email } = req.body;
    if (!token || !email)
        return res.status(400).json({ message: 'Token o email mancanti' });
    try {
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'supersegreto');
        const user = await user_model_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: 'Utente non trovato con questa email' });
        const hashedPassword = await bcryptjs_1.default.hash(nuovaPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({ message: 'Password aggiornata con successo' });
    }
    catch (err) {
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
exports.default = router;
