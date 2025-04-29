"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Registrazione
const register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existing = await user_model_1.default.findOne({ email });
        if (existing) {
            res.status(400).json({ message: 'Utente già registrato' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = new user_model_1.default({ username, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Registrazione avvenuta con successo' });
    }
    catch (err) {
        res.status(500).json({ message: 'Errore registrazione', error: err });
    }
};
exports.register = register;
// Login classico email/password
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ message: 'Utente non trovato' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.password || '');
        if (!valid) {
            res.status(401).json({ message: 'Password errata' });
            return;
        }
        // Type narrowing: assicurati che user._id sia stringa
        const userId = user._id.toString();
        const token = jsonwebtoken_1.default.sign({ userId, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        console.log('\n\n\n\n\n\n\n\n\nqifsha fisin token prima di login:', token);
        console.log('qifsha fisin user prima di login:', user);
        res.json({ token, user });
    }
    catch (err) {
        res.status(500).json({ message: 'Errore login', error: err });
    }
};
exports.login = login;
