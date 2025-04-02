import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from './auth/passport'; // import del passport
import session from 'express-session';
import authRoutes from './auth/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
/* const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:admin@tpsi.twqyd.mongodb.net/'; */
/*  */

const MONGO_URI = process.env.CONNECTIONSTRINGLOCAL! + process.env.DBNAME!;
// Middleware
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: true,
  })
);


// Inizializza passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authRoutes); // Aggiungi questa riga per le perizie

app.get('/', (req, res) => {
  res.send('✅ Backend avviato');
});

// Connessione a MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connessione a MongoDB riuscita');
    app.listen(PORT, () => {
      console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Errore di connessione a MongoDB:', err);
  });
