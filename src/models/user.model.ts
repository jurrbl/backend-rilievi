import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  googleId: string; // Obbligatorio
  googleUsername ?: string; // Opzionale per utenti Google
  email: string;
  password?: string; // Opzionale per utenti Google
  username: string; // Obbligatorio
}

const UserSchema: Schema = new Schema(
  {
    googleId: { type: String, required: true, unique: true }, // Obbligatorio
    googleUsername: { type: String }, // Aggiunto
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Non obbligatorio
    username: { type: String, required: true, unique: true }, // Obbligatorio
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);