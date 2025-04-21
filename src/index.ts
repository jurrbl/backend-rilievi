import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from './auth/passport';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import authRoutes from './auth/auth.routes';
import operatorRoutes from './auth/operator.routes';
import adminRoutes from './auth/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.CONNECTIONSTRINGLOCAL! + process.env.DBNAME!;

// 🔧 Middleware
app.use(cors({
  origin: ['https://backend-rilievi.onrender.com', 'http://localhost:4200'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // solo su HTTPS
      sameSite: 'none'
    }
  })
);;

// 🔐 Passport
app.use(passport.initialize());
app.use(passport.session());

// 🌐 Routes
app.use('/api/auth', authRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('✅ Backend avviato');
});

// 🚀 Start
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
