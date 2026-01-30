import { Reservation, Conversation, User } from "../../models/index.js";
import { Op } from "sequelize";

const getCurrentUserFromReq = async (req) => {
    // Si la session Passport est présente, utiliser dbUser
    const sessionUser = req.user?.dbUser;
    if (sessionUser) return sessionUser;

    // Si pas de session Passport, retourner erreur (plus de fallback Firebase)
    const error = new Error("Utilisateur non authentifié");
    error.statusCode = 401;
    throw error;
};

const getReservationWithAccess = async (reservationId, user) => {
    const reservation = await Reservation.findByPk(reservationId, {
        include: [{ model: Conversation }]
    });

    if (!reservation) {
        const error = new Error("Réservation non trouvée");
        error.statusCode = 404;
        throw error;
    }

    if (reservation.Conversation.voyager_id !== user.id && reservation.Conversation.local_id !== user.id) {
        const error = new Error("Non autorisé");
        error.statusCode = 403;
        throw error;
    }

    return reservation;
};

const handleReservationStatusUpdate = async (req, res, status) => {
    try {
        const { id } = req.params;
        const user = await getCurrentUserFromReq(req);
        const reservation = await getReservationWithAccess(id, user);

        if (reservation.status !== 'pending') {
            return res.status(400).json({ error: "La réservation a déjà été traitée" });
        }

        reservation.status = status;
        await reservation.save();

        res.json(reservation);
    } catch (err) {
        console.error(`Erreur update status (${status}):`, err);
        res.status(err.statusCode || 500).json({ error: err.message || "Erreur serveur" });
    }
};

// --- Controller Methods ---

export const createReservation = async (req, res) => {
    try {
        const { title, conversation_id, price, date, end_date } = req.body;
        const user = await getCurrentUserFromReq(req);

        // Validate required fields
        if (!title || !conversation_id || price == null || !date || !end_date) {
            return res.status(400).json({ error: "Tous les champs sont requis" });
        }

        // Validate field types - parse price if it's a string
        const parsedPrice = typeof price === 'string' ? Number(price) : price;
        if (typeof parsedPrice !== 'number' || isNaN(parsedPrice)) {
            return res.status(400).json({ error: "Le prix doit être un nombre valide" });
        }

        // Validate dates are valid date strings
        const parsedDate = new Date(date);
        const parsedEndDate = new Date(end_date);
        if (isNaN(parsedDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({ error: "Les dates doivent être valides" });
        }

        // Validation des dates
        if (parsedEndDate <= parsedDate) {
            return res.status(400).json({ error: "La date de fin doit être postérieure à la date de début" });
        }
        const now = new Date();
        if (parsedDate < now) {
            return res.status(400).json({ error: "La date de début doit être dans le futur" });
        }
        if (parsedEndDate < now) {
            return res.status(400).json({ error: "La date de fin doit être dans le futur" });
        }

        // Validation du prix
        if (parsedPrice <= 0) {
            return res.status(400).json({ error: "Le prix doit être supérieur à zéro" });
        }

        const conversation = await Conversation.findByPk(conversation_id);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation non trouvée" });
        }

        if (conversation.voyager_id !== user.id && conversation.local_id !== user.id) {
            return res.status(403).json({ error: "Vous ne faites pas partie de cette conversation" });
        }

        const reservation = await Reservation.create({
            title,
            conversation_id,
            price: parsedPrice,
            date,
            end_date,
            status: 'pending'
        });

        res.status(201).json(reservation);
    } catch (err) {
        console.error("Erreur createReservation:", err);
        res.status(err.statusCode || 500).json({ error: err.message || "Erreur lors de la création de la réservation" });
    }
};

export const getMyReservations = async (req, res) => {
    try {
        const user = await getCurrentUserFromReq(req);

        const conversations = await Conversation.findAll({
            where: {
                [Op.or]: [
                    { voyager_id: user.id },
                    { local_id: user.id }
                ]
            },
            attributes: ['id']
        });

        const convIds = conversations.map(c => c.id);

        if (convIds.length === 0) {
            return res.json([]);
        }

        const reservations = await Reservation.findAll({
            where: {
                conversation_id: {
                    [Op.in]: convIds
                }
            },
            include: [
                {
                    model: Conversation,
                    include: [
                        { model: User, as: 'Voyager', attributes: ['id', 'name', 'email'] },
                        { model: User, as: 'Local', attributes: ['id', 'name', 'email'] }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(reservations);
    } catch (err) {
        console.error("Erreur getMyReservations:", err);
        res.status(err.statusCode || 500).json({ error: err.message || "Erreur lors de la récupération des réservations" });
    }
};

export const acceptReservation = async (req, res) => {
    return handleReservationStatusUpdate(req, res, 'accepted');
};

export const declineReservation = async (req, res) => {
    return handleReservationStatusUpdate(req, res, 'declined');
};
