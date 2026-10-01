import prisma from "./lib/prisma.js";

const characters = await prisma.characters.findMany();

console.log("Characters:", characters);

await prisma.$disconnect();