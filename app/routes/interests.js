// routes/interests.js
import express from "express";
import { getAllInterests } from "../controllers/interestsController.js";

const router = express.Router();

// GET /interests : liste tous les intérêts disponibles
router.get("/", getAllInterests);

export default router;
