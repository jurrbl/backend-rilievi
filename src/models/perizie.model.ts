// src/models/perizie.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IFoto {
  url: string;
  commento?: string;
}

export interface IPerizia extends Document {
  codicePerizia: string;
  codiceOperatore: mongoose.Types.ObjectId;
  dataOra: Date;
  coordinate: {
    latitudine: number;
    longitudine: number;
  };
  indirizzo: string; // ✅ Aggiunto qui
  descrizione: string;
  fotografie: IFoto[];
  stato: 'in_corso' | 'completata' | 'annullata';
}

const FotoSchema = new Schema<IFoto>({
  url: { type: String, required: true },
  commento: { type: String },
});

const PeriziaSchema = new Schema<IPerizia>(
  {
    codicePerizia: { type: String, required: true, unique: true },
    codiceOperatore: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dataOra: { type: Date, required: true },
    coordinate: {
      latitudine: { type: Number, required: true },
      longitudine: { type: Number, required: true },
    },
    indirizzo: { type: String, required: true }, // ✅ Aggiunto qui
    descrizione: { type: String, required: true },
    fotografie: {
      type: [FotoSchema],
      required: true,
      default: [],
    },
    stato: {
      type: String,
      enum: ['in_corso', 'completata', 'annullata'],
      default: 'in_corso',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPerizia>('Perizia', PeriziaSchema, 'perizie');
