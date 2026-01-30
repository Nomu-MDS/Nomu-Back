// controllers/adminUsersController.js
import { User, Profile, Wallet } from "../models/index.js";
import { Op } from "sequelize";

// Récupérer tous les utilisateurs avec pagination (admin uniquement)
export const adminGetAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;
    
    // Filtres optionnels
    const where = {};
    if (req.query.role) {
      where.role = req.query.role;
    }
    if (req.query.is_active !== undefined) {
      where.is_active = req.query.is_active === "true";
    }
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { email: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [
        { model: Profile, attributes: ["id", "is_searchable", "biography"] },
        { model: Wallet, as: "Wallet", attributes: ["id", "balance"] },
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: count,
        perPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Erreur adminGetAllUsers:", err);
    res.status(500).json({ error: "Erreur récupération utilisateurs" });
  }
};

// Récupérer le profil complet d'un utilisateur (admin uniquement)
export const adminGetUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [
        { model: Profile },
        { model: Wallet, as: "Wallet" },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json(user);
  } catch (err) {
    console.error("Erreur adminGetUserById:", err);
    res.status(500).json({ error: "Erreur récupération utilisateur" });
  }
};

// Mettre à jour un utilisateur (admin - seulement is_active et role)
export const adminUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, role } = req.body;

    // Validation : seulement is_active et role autorisés
    if (is_active === undefined && role === undefined) {
      return res.status(400).json({ 
        error: "Au moins un champ à modifier requis (is_active ou role)" 
      });
    }

    // Validation du rôle si fourni
    const allowedRoles = ["user", "admin", "local"];
    if (role !== undefined && !allowedRoles.includes(role)) {
      return res.status(400).json({ 
        error: `Rôle invalide. Valeurs autorisées : ${allowedRoles.join(", ")}` 
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Empêcher l'admin de se désactiver ou de changer son propre rôle
    if (user.id === req.user.dbUser.id) {
      if (is_active === false) {
        return res.status(403).json({ 
          error: "Vous ne pouvez pas vous désactiver vous-même" 
        });
      }
      if (role && role !== user.role) {
        return res.status(403).json({ 
          error: "Vous ne pouvez pas modifier votre propre rôle" 
        });
      }
    }

    // Mise à jour des champs autorisés uniquement
    if (is_active !== undefined) {
      user.is_active = is_active;
    }
    if (role !== undefined) {
      user.role = role;
    }

    await user.save();

    // Recharger l'utilisateur avec ses relations
    const updatedUser = await User.findByPk(id, {
      include: [
        { model: Profile, attributes: ["id", "is_searchable", "biography"] },
        { model: Wallet, attributes: ["id", "balance"] },
      ],
    });

    res.json(updatedUser);
  } catch (err) {
    console.error("Erreur adminUpdateUser:", err);
    res.status(500).json({ error: "Erreur mise à jour utilisateur" });
  }
};
