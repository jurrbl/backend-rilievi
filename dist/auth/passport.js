"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const dotenv_1 = __importDefault(require("dotenv"));
const user_model_1 = __importDefault(require("../models/user.model")); // Percorso corretto del modello
dotenv_1.default.config();
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (_, __, profile, done) => {
    try {
        const existingUser = await user_model_1.default.findOne({ googleId: profile.id });
        if (existingUser) {
            // Aggiorna sempre l'accesso
            existingUser.lastSeen = new Date().toISOString();
            // Aggiorna la foto solo se mancante
            if (!existingUser.profilePicture && profile.photos?.[0]?.value) {
                existingUser.profilePicture = profile.photos[0].value;
            }
            await existingUser.save();
            console.log('✅ Utente aggiornato con lastSeen:', existingUser.lastSeen);
            return done(null, existingUser); // Utente trovato
        }
        // ⛔ Se non trovi l'email, interrompi
        if (!profile.emails || !profile.emails[0]?.value) {
            return done(new Error('Email non trovata nel profilo Google'), false);
        }
        // ✅ Crea un nuovo utente
        const newUser = await user_model_1.default.create({
            googleId: profile.id,
            googleUsername: profile.displayName,
            email: profile.emails[0].value,
            username: profile.displayName,
            profilePicture: profile.photos?.[0]?.value || '',
        });
        console.log('🆕 Nuovo utente creato con foto profilo:', newUser.profilePicture);
        return done(null, newUser); // ✅ Utente salvato
    }
    catch (err) {
        return done(err, false);
    }
}));
exports.default = passport_1.default;
