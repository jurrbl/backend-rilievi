"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
const verifyToken = (req, res, next) => {
    const token = req.cookies?.jwt;
    console.log("Token ricevuto:", token); // Log del token ricevuto
    if (!token) {
        res.status(401).json({ message: "Token mancante" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
        req.user = decoded;
        next(); // ✅ prosegui se il token è valido
    }
    catch (err) {
        res.status(403).json({ message: "Token non valido" });
    }
};
exports.verifyToken = verifyToken;
// 🛡️ Middleware per proteggere rotte admin
const verifyAdmin = async (req, res, next) => {
    const token = req.cookies?.jwt;
    if (!token) {
        res.status(401).json({ message: "Token mancante" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
        req.user = decoded;
        const user = await user_model_1.default.findById(decoded.id);
        if (!user) {
            res.status(404).json({ message: "Utente non trovato" });
            return;
        }
        if (user.role !== "admin") {
            res.status(403).json({ message: "Accesso negato: solo admin" });
            return;
        }
        next();
    }
    catch (err) {
        res.status(403).json({ message: "Token non valido" });
    }
};
exports.verifyAdmin = verifyAdmin;
