import prisma from '../../prisma/prismaClient';

// get allgames

export const getAllGames = async (req, res) => {
    games = await prisma.scene.findMany()
    console.log(games)
}
