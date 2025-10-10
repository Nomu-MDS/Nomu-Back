// app/routes/usersRoutes.js
import express from "express";
import { createUser, searchUsers, semanticSearch } from "../controllers/usersController.js";

const router = express.Router();

router.post("/", createUser);
router.get("/search", searchUsers);
router.get("/semantic-search", semanticSearch);

export default router;

