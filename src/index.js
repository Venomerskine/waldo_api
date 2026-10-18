import cors from "cors"
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:5173"
}))

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});