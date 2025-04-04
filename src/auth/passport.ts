import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../models/user.model'; // Percorso corretto del modello

dotenv.config();

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
},
async (_, __, profile, done) => {
  try {
    const existingUser = await User.findOne({ googleId: profile.id });

    if (existingUser) {
      // 🔁 Aggiorna la foto profilo se non salvata
      if (!existingUser.profilePicture && profile.photos?.[0]?.value) {
        existingUser.profilePicture = profile.photos[0].value;
        await existingUser.save();
        console.log('🖼️ Foto profilo aggiornata per utente esistente.');
      }

      return done(null, existingUser); // ✅ Utente esistente trovato
    }

    // ⛔ Se non trovi l'email, interrompi
    if (!profile.emails || !profile.emails[0]?.value) {
      return done(new Error('Email non trovata nel profilo Google'), false);
    }

    // ✅ Crea un nuovo utente
    const newUser = await User.create({
      googleId: profile.id,
      googleUsername: profile.displayName,
      email: profile.emails[0].value,
      username: profile.displayName,
      profilePicture: profile.photos?.[0]?.value || '',
    });

    console.log('🆕 Nuovo utente creato con foto profilo:', newUser.profilePicture);

    return done(null, newUser); // ✅ Utente salvato
  } catch (err) {
    return done(err, false);
  }
}));

export default passport;
