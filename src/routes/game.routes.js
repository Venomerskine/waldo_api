import express from "express"

import {getAllScenes} from "../controllers/gameController.js"

const router = express.Router();

router.get("/", getAllScenes)

export default router;