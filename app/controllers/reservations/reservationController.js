import { Reservation, Conversation, User } from "../../models/index.js";
import { Op } from "sequelize";

const getUserByFirebaseUid = async (firebaseUid) => {
    const user = await User.findOne({ where: { firebaseUid } });
    if (!user) {
        const error = new Error("Utilisateur non trouvé");
        error.statusCode = 404;
        throw error;
    }
    return user;
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

    if (reservation.Conversation.voyagerID !== user.id && reservation.Conversation.localID !== user.id) {
        const error = new Error("Non autorisé");
        error.statusCode = 403;
        throw error;
    }

    return reservation;
};

const handleReservationStatusUpdate = async (req, res, status) => {
    try {
        const { id } = req.params;
        const user = await getUserByFirebaseUid(req.user.uid);
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
        const { title, conv_id, price, date, end_date } = req.body;
        const user = await getUserByFirebaseUid(req.user.uid);

        // Validate required fields
        if (!title || !conv_id || price === undefined || !date || !end_date) {
            return res.status(400).json({ error: "Tous les champs sont requis" });
        }

        // Validate field types
        if (typeof price !== 'number' || isNaN(price)) {
            return res.status(400).json({ error: "Le prix doit être un nombre valide" });
        }

        if (isNaN(Date.parse(date)) || isNaN(Date.parse(end_date))) {
            return res.status(400).json({ error: "Les dates doivent être valides" });
        }

        // Validation des dates
        if (new Date(end_date) <= new Date(date)) {
            return res.status(400).json({ error: "La date de fin doit être postérieure à la date de début" });
        }

        // Validation du prix
        if (price <= 0) {
            return res.status(400).json({ error: "Le prix doit être supérieur à zéro" });
        }

        const conversation = await Conversation.findByPk(conv_id);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation non trouvée" });
        }

        if (conversation.voyagerID !== user.id && conversation.localID !== user.id) {
            return res.status(403).json({ error: "Vous ne faites pas partie de cette conversation" });
        }

        const reservation = await Reservation.create({
            title,
            conv_id,
            price,
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
        const user = await getUserByFirebaseUid(req.user.uid);

        const conversations = await Conversation.findAll({
            where: {
                [Op.or]: [
                    { voyagerID: user.id },
                    { localID: user.id }
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
                conv_id: {
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
