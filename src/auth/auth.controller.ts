import { Request, Response } from 'express';
import User from '../models/user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose'; 

// Registrazione
export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ message: 'Utente già registrato' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Registrazione avvenuta con successo' });
  } catch (err) {
    res.status(500).json({ message: 'Errore registrazione', error: err });
  }
};

// Login classico email/password
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ message: 'Utente non trovato' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) {
      res.status(401).json({ message: 'Password errata' });
      return;
    }

    // Type narrowing: assicurati che user._id sia stringa
    const userId = (user._id as Types.ObjectId).toString();

    const token = jwt.sign(
        { userId, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
      );
      
      console.log('\n\n\n\n\n\n\n\n\nqifsha fisin token prima di login:', token);
    console.log('qifsha fisin user prima di login:', user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Errore login', error: err });
  }
};
