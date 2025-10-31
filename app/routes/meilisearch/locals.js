// Routes locaux
import express from "express";
import { addLocals, getLocals, searchLocals } from "../../controllers/meilisearch/localsController.js";

const router = express.Router();

router.post("/", addLocals);
router.get("/", getLocals);
router.get("/search", searchLocals);

export default router;
