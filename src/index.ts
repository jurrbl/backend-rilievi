import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from './auth/passport';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import authRoutes from './auth/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.CONNECTIONSTRINGLOCAL! + process.env.DBNAME!;

// ✅ CORS corretto per i cookie  
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

// ✅ Middleware fondamentali
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: true,
  })
);

// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ API routes
app.use('/api/auth', authRoutes);

// ✅ Ping route
app.get('/', (req, res) => {
  res.send('✅ Backend avviato');
});

// ✅ Connessione DB + avvio server
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
