"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/perizie.model.ts
const mongoose_1 = __importStar(require("mongoose"));
const FotoSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    commento: { type: String },
});
const RevisioneAdminSchema = new mongoose_1.Schema({
    id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    profilePicture: { type: String },
    commento: { type: String, required: false }
}, { _id: false });
const PeriziaSchema = new mongoose_1.Schema({
    codicePerizia: { type: String, required: true, unique: true },
    codiceOperatore: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('Perizia', PeriziaSchema, 'perizie');
