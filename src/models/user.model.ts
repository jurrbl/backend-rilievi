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
  role: 'User' | 'Admin'; // ruoli ammessi
  profilePicture?: string; // 
}

const UserSchema: Schema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    googleUsername: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    username: { type: String, required: true, unique: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    phone: { type: String, default: '+39 3665950984' },
    lastSeen: { type: String },
    profilePicture: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
