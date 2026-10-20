import prisma from '../lib/prisma.js';

// get all scenes

// Get all scenes from the database
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


// Get a specific scene and its details (include characters) by ID

export const getSceneById = async (req, res) => {
    console.log("Req params :", req.params.sceneId)
    const sceneId = req.params.sceneId;
    try {
        const scene = await prisma.scene.findUnique({
            where: { id: parseInt(sceneId) },
            include: { characters: true }
        });
        if (!scene) {
            return res.status(404).json({ message: "Scene not found" });
        }
        res.json(scene);
    } catch (err) {
        console.error("Error Loading Scene: ", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
