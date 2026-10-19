import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import gameRoutes from './routes/game.routes.js'
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  "/images",
  express.static(path.join(__dirname, "public", "images"))
)

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());


app.use('/api/games', gameRoutes)

export default app;