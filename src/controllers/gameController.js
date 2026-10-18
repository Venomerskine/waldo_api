import prisma from '../lib/prisma.js';

// get allgames

export const getAllGames = async (req, res) => {
    try {
        const games = await prisma.scene.findMany()
        console.log(games)
        res.json(games)
    } catch(err){
        console.error("Error Loading Games: ", err)
        res.status(500).json({message: "Internal server erro"})
    }
    
}
