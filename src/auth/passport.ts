import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
// Removed unused jwt import
import User from '../models/user.model'; // <-- aggiorna il percorso del modello

dotenv.config();

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
}, async (_, __, profile, done) => {
  try {
    const existingUser = await User.findOne({ googleId: profile.id });
    if (existingUser) {
      return done(null, existingUser); // ✅ già registrato
    }

    if (!profile.emails || !profile.emails[0]?.value) {
      return done(new Error('Email non trovata nel profilo Google'), false); 
    }

    const newUser = await User.create({
      googleId: profile.id,
      googleUsername: profile.displayName,
      email: profile.emails[0].value,
      username: profile.displayName
    });

    return done(null, newUser); // ✅ nuovo utente salvato
  } catch (err) {
    return done(err, false);
  }
}));


export default passport;
