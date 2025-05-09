"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const passport_1 = __importDefault(require("./auth/passport"));
const express_session_1 = __importDefault(require("express-session"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = __importDefault(require("./auth/auth.routes"));
const operator_routes_1 = __importDefault(require("./auth/operator.routes"));
const admin_routes_1 = __importDefault(require("./auth/admin.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.CONNECTIONSTRINGLOCAL + process.env.DBNAME;
const isProduction = process.env.NODE_ENV === "production";
// 🔧 Middleware
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:4200",
        "http://localhost:8101",
        "http://localhost:8100",
        "https://localhost",
        "capacitor://localhost",
        "ionic://localhost",
        "rilievi-e-perizie.vercel.app",
        "https://rilievi-e-perizie.vercel.app",
    ],
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
const isRender = process.env.RENDER === "true"; // su Render è true
app.use((0, express_session_1.default)({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isRender, // ← true su Render
        sameSite: isRender ? "none" : "lax",
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// 🌐 Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/operator", operator_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.get("/", (req, res) => {
    res.send("✅ Backend avviato");
});
// 🚀 Start
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => {
    console.log("✅ Connessione a MongoDB riuscita");
    app.listen(PORT, () => {
        console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    1;
    console.error("❌ Errore di connessione a MongoDB:", err);
});
