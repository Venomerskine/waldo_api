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


// export const verifyGuess = async (req, res) => {
//     const sceneId = Number(req.params.sceneId)
//     console.log("SceneId", sceneId)

//     console.log(req.body)
//     const characterId = req.body.character.characterId
//     const {x, y} = req.body.clickedPosition

//     console.log(characterId, x, y)

//     if(
//         !Number.isInteger(sceneId) ||
//         !Number.isInteger(characterId) ||
//         !Number.isFinite(x) ||
//         !Number.isFinite(y)
//         )
//      {
//         return res.status(400).json({
//             message: "Invalid guess data"
//         });
//     }

//     try {

//         const target = await prisma.sceneCharacter.findUnique({
//             where: {
//                 sceneId_characterId: {
//                     sceneId,
//                     characterId,
//                 },
//             },
//             select: {
//                 xPosition: true,
//                 yPosition: true,
//                 radius: true,
//             },
//         });

//         console.log(target)



//         if (!target) {
//             return res.status(404).json({
//                 message: "Character not found in this scene",
//             });
//         }

//         const targetX = Number(target.xPosition);
//         const targetY = Number(target.yPosition);
//         const radius = Number(target.radius);

//         const dx = x-targetX
//         const dy = y-targetY

//         const distance = Math.sqrt(dx * dx + dy * dy);
//         const found = distance <= radius;

//         return res.json({ 
//             found,
//             characterId: characterId,
//         })

//     } catch (err) {
//         console.error("Error verifying guess:", err);
//         return res.status(500).json({
//             message: "Internal Server Error!"
//         })
//     }

// }

// Updated Verify guess controller to include game session logic

export const verifyGuess = async (req, res, next) => {
    try {
        const sceneId = Number(req.params.sceneId);
        const gameSessionId = Number(req.body.gameSessionId);
        const characterId = req.body.character.characterId;
        const x = Number(req.body.clickedPosition?.x);
        const y = Number(req.body.clickedPosition?.y);

        if  (
            !Number.isInteger(sceneId) || 
            sceneId <= 0 || 
            !Number.isInteger(gameSessionId) || 
            gameSessionId <= 0 || 
            !Number.isInteger(characterId) ||
            characterId <= 0 ||
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            return res.status(400).json({
                message: "Invalid game, character, or clicked position",
            })
        }

        const result = await prisma.$transaction(async (tx) => {
            const game = await tx.gameSession.findUnique({
                where: { id: gameSessionId },
                
            });

            if (!game || game.sceneId !== sceneId) {
                return { error: "GAME_NOT_FOUND" };
            }

            if (game.status !== "IN_PROGRESS") {
                return { error: "GAME_NOT_IN_PROGRESS" };
            }

            const target = await tx.sceneCharacter.findUnique({
                where: {
                    sceneId_characterId: {
                        sceneId,
                        characterId,
                    },
                },

                select: {
                    id:true,
                    xPosition: true,
                    yPosition: true,
                    radius: true,
                },
            });

            if (!target) {
                return { error: "CHARACTER_NOT_FOUND" };
            }

            const sessionCharacter = await tx.gameSessionCharacter.findUnique({
                where: {
                    gameSessionId_sceneCharacterId: {
                        gameSessionId,
                        sceneCharacterId: target.id,
                    },
                },
            });

            if (!sessionCharacter) {
                return { error: "CHARACTER_NOT_IN_SESSION" };
            }

            if (sessionCharacter.found) {
                const remainingCount = await tx.gameSessionCharacter.count({
                    where: {
                        gameSessionId,
                        found: false,
                    },
                });

                return {
                    found: false,
                    alreadyFound: true,
                    remainingCount,
                    status: game.status,
                };
            }

            // Compare the clicked position with the target's position and radius
     
            const targetX = Number(target.xPosition);
            const targetY = Number(target.yPosition);
            const radius = Number(target.radius);

            const dx = x - targetX;
            const dy = y - targetY;

            const distance = Math.sqrt(dx * dx + dy * dy);
            const found = distance <= radius;


            // Incorrect guess: leave database unchanged
            if (!found) {
                const remainingCount = await tx.gameSessionCharacter.count({
                    where: {
                        gameSessionId,
                        found: false,
                    },
                });

                return {
                    found: false,
                    alreadyFound: false,
                    remainingCount,
                    status: game.status,
                };
            }

            // Mark the target as found only if its still unfound
            const update = await tx.gameSessionCharacter.updateMany({
                where: {
                    sceneCharacterId: target.id,
                    gameSessionId: gameSessionId,
                    found: false,
                },
                data: {
                    found: true,
                },
            });

            if (update.count === 0) {
                return { error: "CHARACTER_ALREADY_FOUND" };
            }

            // Count the remaining targets
            const remainingCount = await tx.gameSessionId_sceneCharacterId.count({
                where: {
                    gameSessionId,
                    found: false,
                }
            });

            // Complete the game when all targets are found
            let status = "IN_PROGRESS";

            if (remainingCount === 0) {
                await tx.gameSession.update({
                where: { id: gameSessionId },
                data: { status: "COMPLETED" }

                });

                status = "COMPLETED";

                }

                return {
                    found: true,
                    alreadyFound: false,
                    remainingCount,
                    status,
                }

            });

            // Send the appropriater HTTP response outside the transaction
            if (result.error === "GAME_NOT_FOUND") {
                return res.status(404).json({ message: "Game session not found for this scene" });
            }

            if (result.error === "CHARACTER_NOT_IN_SCENE") {
                return res.status(400).json({ message: "Character is not in the specified scene" });
            }

            if (result.error === "CHARACTER_NOT_IN_SESSION") {
                return res.status(400).json({ message: "Character is not part of the current game session" });
            }

            if (result.error === "GAME_NOT_IN_PROGRESS") {
                return res.status(400).json({ message: "Game session is not in progress" });
            }

            if (result.error === "CHARACTER_ALREADY_FOUND") {
                return res.status(400).json({ message: "Character has already been found in this game session" });
            }

            return res.status(200).json(result);
    } catch (error) {
        next(error)
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
