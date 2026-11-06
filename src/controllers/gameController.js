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



export const getRemainingTargets = async (req, res, next) => {
    try {
        const gameSessionId = Number(req.params.gameSessionId);
    
        console.log("Get Remaining Targets - Game Session Id: ", gameSessionId)
        if (!Number.isInteger(gameSessionId) || gameSessionId <= 0) {
            return res.status(400).json({ message: "Invalid game session ID" });
        }
       
    const remainingTargets = await prisma.gameSessionCharacter.findMany({
        where: {
            gameSessionId: Number(req.params.gameSessionId),
            foundAt: null,
        },
        select: {
            sceneCharacterId: true,
            sceneCharacter: {
                select: {
                    characterId: true,
                }
            }
        }
    });
    console.log("Remaining Targets: ", remainingTargets.map(({ sceneCharacterId, sceneCharacter }) => ({
        sceneCharacterId, 
        characterId: sceneCharacter.characterId,
    })))
    const result = remainingTargets.map(({ sceneCharacterId, sceneCharacter }) => ({
        sceneCharacterId, 
        characterId: sceneCharacter.characterId,
    }));
    console.log("Remaining Targets Result: ", result)
    return result.length > 0 ? res.status(200).json(result) : res.status(404).json({ message: "No remaining targets found" });
} catch (err) {
    console.error("Error getting remaining targets:", err);
    return res.status(500).json({
        message: "Internal Server Error!"
    })  
}
}

export const verifyGuess = async (req, res, next) => {
    try {
        const sceneId = Number(req.params.sceneId);
        const gameSessionId = Number(req.body.gameSessionId);
        const characterId = req.body.character.characterId;
        const x = Number(req.body.clickedPosition?.x);
        const y = Number(req.body.clickedPosition?.y);

        console.log("Verify Guess - Scene Id: ", sceneId)
        console.log("Verify Guess - Game Session Id: ", gameSessionId)
        console.log("Verify Guess - Character Id: ", characterId)
        console.log("Verify Guess - Clicked Position: ", { x, y })

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


        // Get remaining targets output look like this: [{ sceneCharacterId: 1, characterId: 1 }, { sceneCharacterId: 2, characterId: 2 }]
        const getRemainingTargets = async () => {
            const gameSessionId = Number(req.body.gameSessionId);
            const targets = await prisma.gameSessionCharacter.findMany({
                where: {
                    gameSessionId,
                    foundAt: null,
                },
                select: {
                    sceneCharacterId: true,
                    sceneCharacter: {
                        select: {
                            characterId: true,
                        }
                    }
                }
            })
            return targets.map(({ sceneCharacterId, sceneCharacter }) => ({
                sceneCharacterId, 
                characterId: sceneCharacter.characterId,
            }));
        }

        const result = await prisma.$transaction(async (tx) => {
            const game = await tx.gameSession.findUnique({
                where: { id: gameSessionId },
                select: { sceneId: true, status: true },
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
                    // error here
                    gameSessionId_sceneCharacterId: {
                        gameSessionId,
                        sceneCharacterId: target.id,
                    },
                },
            });

            // console.log("game cnontroller - Session Character: ", sessionCharacter)

            if (!sessionCharacter) {
                return { error: "CHARACTER_NOT_IN_SESSION" };
            }

            if (sessionCharacter.foundAt) {


                return { error: "CHARACTER_ALREADY_FOUND",
                    remainingCount: await getRemainingTargets(),
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
                        foundAt: null,
                    },
                });

                return {
                    found: false,
                    foundAt: null,
                    alreadyFound: false,
                    remainingCount,
                    remainingTargets: await getRemainingTargets(),
                    status: game.status,
                };
            }

            // Mark the target as found only if its still unfound
            const foundAt = new Date();
            const update = await tx.gameSessionCharacter.updateMany({
                where: {
                    sceneCharacterId: target.id,
                    gameSessionId: gameSessionId,
                    foundAt: null,
                },
                data: {
                    foundAt,
                },
            });

            // console.log("Game controller - Update Result: ", update)

            if (update.count === 0) {
                return {
                     error: "CHARACTER_ALREADY_FOUND",
                     remainingCount: await getRemainingTargets(),
                 };
            }

            // Count the remaining targets
            const remainingCount = await tx.gameSessionCharacter.count({
                where: {
                    gameSessionId,
                    foundAt: null,
                }
            });
       
           
            // Complete the game when all targets are found
            let status = "IN_PROGRESS";

            if (remainingCount === 0) {
                await tx.gameSession.update({
                    where: { id: gameSessionId },
                    data: { status: "COMPLETED" },

                });

                status = "COMPLETED";

                }

                return {
                    found: true,
                    foundAt,
                    alreadyFound: false,
                    remainingCount,
                    status,
                }

        });

            // Send the appropriater HTTP response outside the transaction


        if (result.error === "GAME_NOT_FOUND") {
            return res.status(404).json({ message: "Game session not found for this scene" });
        }

        if (result.error === "CHARACTER_NOT_FOUND") {
            return res.status(400).json({ message: "Character is not in the specified scene" });
        }

        if (result.error === "CHARACTER_NOT_IN_SESSION") {
            return res.status(400).json({ message: "Character is not part of the current game session" });
        }

        if (result.error === "GAME_NOT_IN_PROGRESS") {
            return res.status(400).json({ message: "Game session is not in progress" });
        }

        if (result.error === "CHARACTER_ALREADY_FOUND") {
            return res.status(409).json({ message: "Character has already been found in this game session" });
        }

        //  console.log("Game controller - Remaining Targets: ", await getRemainingTargets())

        return res.status(200).json(result, { remainingTargets: await getRemainingTargets() });
    } catch (error) {
        next(error)
    }
}
    

// Start Game

export const startGame = async (req, res, next) => {
// console.log("GameController - prisma: ", prisma.gameSessionCharacter)


    try {
        const sceneId = Number(req.params.sceneId)
        // Log scene id
        console.log("Start Game - Scene Id: ", sceneId)

        if (!Number.isInteger(sceneId) || sceneId <= 0) {
            return res.status(400).json({ message: "Invalid scene ID" });
        }

        const game = await prisma.$transaction(async (tx) => {
            const targets = await tx.sceneCharacter.findMany({
                where: { sceneId },
                select: { id: true},
            });

            // Log targets
            // console.log("Start Game - targets: ", targets)

            // console.log("Start Game - tx", tx)
          
            if (targets.length === 0) {
                throw new Error("Scene has no Targets")
            }

            return tx.gameSession.create({
                data: {
                    sceneId,
                    status: "IN_PROGRESS",
                    characters: {
                        create: targets.map((target) => ({
                            sceneCharacterId: target.id,
                        }))
                    },
                },
                include: {
                    characters: true,
                }
            })
         });

        //  console.log("Start Game - New Game Session: ", game)

         return res.status(201).json({
            gameSessionId: game.id,
            status: game.status,
            remainingCount: game.characters.length
         })
} catch (error) {
    if (error.message === "Scene has no Targets") {
        return res.status(400).json({ message: "Scene has no targets" });
    }
    next(error)
}
};

