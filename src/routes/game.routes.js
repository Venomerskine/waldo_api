import express from "express"

import {getAllScenes} from "../controllers/gameController.js"
import { getSceneById } from "../controllers/gameController.js";
import { verifyGuess } from "../controllers/gameController.js";

const router = express.Router();

router.get("/", getAllScenes)
router.get("/scenes/:sceneId", getSceneById)
router.post("/scenes/:sceneId/verify-guess", verifyGuess)

export default router;