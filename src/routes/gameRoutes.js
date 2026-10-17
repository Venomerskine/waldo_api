import express from "express"

import {getAllGames} from "../controllers/gameController"

const router = express.Router();

router.get("/", getAllGames)