// routes/localsRoutes.js
import express from "express";
import {
  addLocals,
  searchLocals,
  getLocals,
} from "../controllers/localsController.js";

const router = express.Router();

router.get("/", getLocals);
router.post("/", addLocals);
router.get("/search", searchLocals);

export default router;

