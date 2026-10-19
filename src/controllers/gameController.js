import prisma from '../lib/prisma.js';

// get all scenes

export const getAllScenes = async (req, res) => {
    try {
        const scenes = await prisma.scene.findMany()
        console.log("Scenes", scenes)
        res.json(scenes)
    } catch(err){
        console.error("Error Loading Scenes: ", err)
        res.status(500).json({message: "Internal server error"})
    }
    
}
