import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const imageRoot = "/images/";

const sceneSeeds = [
  {
    name: "beach",
    imageUrl: `${imageRoot}Wheres-Waldo-Beach-Super-High-Resolution-scaled-B27IRiag.jpg`,
    width: 2560,
    height: 1644,
    description: "Find the characters hidden at the beach.",
    targets: [
      ["Odlaw", 31.8571, 63.3],
      ["Wizard Whitebeard", 26.9869, 35.9829],
      ["Waldo", 61.823038, 37.3488],
      // Assumes the supplied `404708` was intended to be `40.4708`.
      ["Wenda", 77.23621, 40.4708],
    ],
  },
  {
    name: "skiing",
    imageUrl: `${imageRoot}Wheres-Waldo-Skiing-Super-High-Resolution-scaled-D5V0lf3M.jpg`,
    width: 2560,
    height: 1623,
    description: "Find the characters hidden on the ski slopes.",
    targets: [
      ["Waldo", 85.299, 72.4286],
      ["Wenda", 48.68151, 41.403],
      ["Odlaw", 31.486, 63.431],
    ],
  },
  {
    name: "candy",
    imageUrl: `${imageRoot}Wheres-Waldo-Candy-Factory-Super-High-Resolution-scaled--og3HhZR.jpg`,
    width: 2560,
    height: 1791,
    description: "Find the characters hidden in the candy factory.",
    targets: [
      ["Wenda", 50.3197, 88.6242],
      ["Waldo", 49.77365, 19.939021],
    ],
  },
  {
    name: "space",
    imageUrl: `${imageRoot}Wheres-Waldo-Space-Station-Super-High-Resolution-scaled-BvxewwE6.jpg`,
    width: 2560,
    height: 1685,
    description: "Find the characters hidden in the space station.",
    targets: [
      ["Wizard Whitebeard", 78.04534, 57.4253],
      ["Waldo", 40.541, 62.1084],
      ["Wenda", 29.3678, 51.3763],
    ],
  },
];

async function findOrCreateCharacter(name) {
  const found = await prisma.character.findFirst({ where: { name } });
  if (found) return found;

  return prisma.character.create({
    data: { name },
  });
}

async function upsertScene(sceneSeed) {
  const { targets, ...sceneData } = sceneSeed;
  const existingScene = await prisma.scene.findFirst({
    where: { name: sceneData.name },
  });

  const scene = existingScene
    ? await prisma.scene.update({ where: { id: existingScene.id }, data: sceneData })
    : await prisma.scene.create({ data: sceneData });

  for (const [characterName, xPosition, yPosition] of targets) {
    const character = await findOrCreateCharacter(characterName);

    await prisma.sceneCharacter.upsert({
      where: {
        sceneId_characterId: {
          sceneId: scene.id,
          characterId: character.id,
        },
      },
      create: {
        sceneId: scene.id,
        characterId: character.id,
        xPosition,
        yPosition,
        radius: 3,
      },
      update: {
        xPosition,
        yPosition,
        radius: 3,
      },
    });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set before seeding.");
  }

  for (const sceneSeed of sceneSeeds) {
    await upsertScene(sceneSeed);
  }

  console.log("Seeded 4 scenes and their character target coordinates.");
}

main()
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
