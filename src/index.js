import express from "express";
import prisma from "./lib/prisma.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Waldo API is running",
  });
});

app.get("/api/characters", async (req, res) => {
  const characters = await prisma.characters.findMany();

  res.json(characters);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});