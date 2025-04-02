import mongoose, { Document, Schema } from 'mongoose';
export interface IUser extends Document {
  googleId: string;
  googleUsername?: string;
  email: string;
  password?: string;
  username: string;
  phone: string;
  lastSeen?: Date;
  role: 'user' | 'admin'; // <-- Restrizione esplicita
}

const UserSchema: Schema = new Schema(
  {
    googleId: { type: String, required: true, unique: true }, // Obbligatorio
    googleUsername: { type: String }, // Aggiunto
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Non obbligatorio
    username: { type: String, required: true, unique: true }, // Obbligatorio
    role: { type: String, required: true, default: 'Utente' }, // Obbligatorio
    phone: { type: String, default: '+39 3665950984'}, // Opzionale per utenti Google
    lastSeen: { type: Date }, // Opzionale per utenti Google
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);