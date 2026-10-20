import express from "express"

import {getAllScenes} from "../controllers/gameController.js"
import { getSceneById } from "../controllers/gameController.js";

const router = express.Router();

router.get("/", getAllScenes)
router.get("/scenes/:sceneId", getSceneById)

export default router;