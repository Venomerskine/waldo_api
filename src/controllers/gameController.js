import prisma from '../lib/prisma.js';

// get all scenes

// Get all scenes from the database
export const getAllScenes = async (req, res) => {
    try {
        const scenes = await prisma.scene.findMany({
            // include: {
            //     characters: {
            //         include: { character: true },
            //     },
            // },
        })
        console.log("Scenes", scenes)
        res.json(scenes)
    } catch(err){
        console.error("Error Loading Scenes: ", err)
        res.status(500).json({message: "Internal server error"})
    }
    
}


// Get a specific scene and its details (include characters) by ID

export const getSceneById = async (req, res) => {
    // console.log("Req params :", req.params.sceneId)
    const sceneId = Number(req.params.sceneId);

    if (!Number.isInteger(sceneId) || sceneId <= 0) {
        return res.status(400).json({ message: "Invalid scene ID" });
    }

    try {
        const scene = await prisma.scene.findUnique({
            where: { id: parseInt(sceneId) },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                width: true,
                height: true,
                description: true,

                characters: {
                    select: {
                        characterId: true,
                        character: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                description: true,
                            },
                        },
                    },
                },
            }
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


export const verifyGuess = async (req, res) => {
    const sceneId = Number(req.params.sceneId)
    console.log("SceneId", sceneId)

    console.log(req.body)
    const characterId = req.body.character.characterId
    const {x, y} = req.body.clickedPosition

    console.log(characterId, x, y)

    if(
        !Number.isInteger(sceneId) ||
        !Number.isInteger(characterId) ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
        )
     {
        return res.status(400).json({
            message: "Invalid guess data"
        });
    }

    try {

        const target = await prisma.sceneCharacter.findUnique({
            where: {
                sceneId_characterId: {
                    sceneId,
                    characterId,
                },
            },
            select: {
                xPosition: true,
                yPosition: true,
                radius: true,
            },
        });

        console.log(target)



        if (!target) {
            return res.status(404).json({
                message: "Character not found in this scene",
            });
        }

        const targetX = Number(target.xPosition);
        const targetY = Number(target.yPosition);
        const radius = Number(target.radius);

        const dx = x-targetX
        const dy = y-targetY

        const distance = Math.sqrt(dx * dx + dy * dy);
        const found = distance <= radius;

        return res.json({ found })

    } catch (err) {
        console.error("Error verifying guess:", err);
        return res.status(500).json({
            message: "Internal Server Error!"
        })
    }

}


// Start Game

export const startGame = async (req, res, next) => {
    try {
        const sceneId = Number(req.params.sceneId)

        if (!Number.isInteger(sceneId) || sceneId <= 0) {
            return res.status(400).json({ message: "Invalid scene ID" });
        }

        const game = await prisma.$transaction(async (tx) => {
            const targets = await tx.sceneCharacter.findMany({
                where: { sceneId },
                select: { id: true},
            });
          
            if (targets.length === 0) {
                throw new Error("Scene has no Targets")
            }

            return tx.gameSession.create({
                data: {
                    sceneId,
                    status: "IN_PROGRESS",
                    gameSessionCharacters: {
                        create: targets.map((target) => ({
                            sceneCharacterId: target.id,
                        }))
                    },
                },
                include: {
                    gameSessionCharacters: true,
                }
            })
         });

         return res.status(201).json({
            gameId: game.id,
            status: game.status,
            remainingCount: game.gameSessionCharacters.length
         })
} catch (error) {
    if (error.message === "Scene has no Targets") {
        return res.status(400).json({ message: "Scene has no targets" });
    }
    next(error)
}
};
