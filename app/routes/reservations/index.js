import express from "express";
import {
    createReservation,
    getMyReservations,
    acceptReservation,
    declineReservation
} from "../../controllers/reservations/reservationController.js";
import { authenticateSession } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authenticateSession);

router.post("/", createReservation);
router.get("/me", getMyReservations);
router.patch("/:id/accept", acceptReservation);
router.patch("/:id/decline", declineReservation);

export default router;
