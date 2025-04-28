// src/models/perizie.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IFoto {
  url: string;
  commento?: string;
}

export interface IRevisioneAdmin {
  id: mongoose.Types.ObjectId;
  username: string;
  profilePicture?: string;
  commento?: string;  // 🔥 aggiungi anche qui
}
export interface IPerizia extends Document {
  codicePerizia: string;
  codiceOperatore: mongoose.Types.ObjectId;
  dataOra: Date;
  coordinate: {
    latitudine: number;
    longitudine: number;
  };
  indirizzo: string;
  descrizione: string;
  revisioneAdmin?: IRevisioneAdmin; // 🔥 ORA revisioneAdmin è un oggetto, non più stringa
  dataRevisione?: Date;              // 🔥 Aggiunto dataRevisione
  commentoAdmin?: string;            // 🔥 Aggiunto commentoAdmin
  fotografie: IFoto[];
  stato: 'in_corso' | 'completata' | 'annullata';
}

const FotoSchema = new Schema<IFoto>({
  url: { type: String, required: true },
  commento: { type: String },
});

const RevisioneAdminSchema = new Schema<IRevisioneAdmin>({
  id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  profilePicture: { type: String },
  commento: { type: String, required: false }
}, { _id: false });

const PeriziaSchema = new Schema<IPerizia>(
  {
    codicePerizia: { type: String, required: true, unique: true },
    codiceOperatore: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dataOra: { type: Date, required: true },
    coordinate: {
      latitudine: { type: Number, required: true },
      longitudine: { type: Number, required: true },
    },
    indirizzo: { type: String, required: true },
    descrizione: { type: String, required: true },
    revisioneAdmin: { type: RevisioneAdminSchema, required: false },
    commentoAdmin: { type: String, required: false }, // 🔥 Aggiunto commentoAdmin
    dataRevisione: { type: Date },                                   
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
