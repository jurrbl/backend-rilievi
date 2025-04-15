// src/models/user.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  googleId: string;
  googleUsername?: string;
  email: string;
  password?: string;
  username: string;
  phone: string;
  lastSeen?: string | Date; // accetta entrambi (utile se vuoi usare direttamente Date oggetti)
  role: 'user' | 'admin'; // ruoli ammessi
  profilePicture?: string; // 
}

  const UserSchema: Schema = new Schema({
    googleId: { type: String }, // <-- via unique e sparse
  googleUsername: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  username: { type: String, required: true, unique: true },
  role: { type: String, enum: ['Admin', 'User', 'Utente'], default: 'user', required: true },
  phone: { type: String, default: '+39 3665950984' },
  lastSeen: { type: String },
  profilePicture: { type: String }
}, { timestamps: true });

// ✅ solo questa riga definisce l’indice in modo corretto
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });
export default mongoose.model<IUser>('User', UserSchema, 'users');
