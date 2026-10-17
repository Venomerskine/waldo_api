import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import gameRoutes from './routes/game.routes.js'

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// app.get("/api/health", (req, res) => {
//   res.json({
//      status: "ok",
//     message: "Waldo API is running!"
//     });
// });
app.use('/api/games', gameRoutes)

export default app;