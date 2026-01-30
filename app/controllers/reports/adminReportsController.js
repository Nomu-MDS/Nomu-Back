// controllers/reports/adminReportsController.js
import { Report, User, Profile } from "../../models/index.js";
import { Op } from "sequelize";

// Récupérer tous les signalements avec pagination et filtres (admin)
export const adminGetAllReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    
    // Filtres optionnels
    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.reportedUserId) {
      where.reported_user_id = req.query.reportedUserId;
    }
    if (req.query.reporterId) {
      where.reporter_id = req.query.reporterId;
    }

    const { count, rows: reports } = await Report.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'Reporter',
          attributes: ['id', 'name', 'email'],
          include: [{
            model: Profile,
            attributes: ['biography', 'city', 'country']
          }]
        },
        {
          model: User,
          as: 'ReportedUser',
          attributes: ['id', 'name', 'email'],
          include: [{
            model: Profile,
            attributes: ['biography', 'city', 'country']
          }]
        },
        {
          model: User,
          as: 'Reviewer',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      reports,
      pagination: {
        currentPage: page,
        totalPages,
        totalReports: count,
        perPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Erreur adminGetAllReports:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des signalements" });
  }
};

// Récupérer un signalement spécifique (admin)
export const adminGetReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findByPk(reportId, {
      include: [
        {
          model: User,
          as: 'Reporter',
          attributes: ['id', 'name', 'email'],
          include: [{
            model: Profile,
            attributes: ['biography', 'city', 'country', 'is_searchable']
          }]
        },
        {
          model: User,
          as: 'ReportedUser',
          attributes: ['id', 'name', 'email', 'is_active', 'role'],
          include: [{
            model: Profile,
            attributes: ['biography', 'city', 'country', 'is_searchable']
          }]
        },
        {
          model: User,
          as: 'Reviewer',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!report) {
      return res.status(404).json({ error: "Signalement introuvable" });
    }

    res.json(report);
  } catch (err) {
    console.error("Erreur adminGetReportById:", err);
    res.status(500).json({ error: "Erreur lors de la récupération du signalement" });
  }
};

// Mettre à jour le statut d'un signalement (admin)
export const adminUpdateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.user.dbUser.id;

    // Vérifier que le statut est valide
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const report = await Report.findByPk(reportId);

    if (!report) {
      return res.status(404).json({ error: "Signalement introuvable" });
    }

    // Mettre à jour le signalement
    report.status = status;
    report.reviewed_by = adminId;
    report.reviewed_at = new Date();
    if (adminNotes) {
      report.admin_notes = adminNotes;
    }

    await report.save();

    // Recharger avec les relations
    await report.reload({
      include: [
        {
          model: User,
          as: 'Reporter',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'ReportedUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'Reviewer',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      message: "Signalement mis à jour avec succès",
      report
    });
  } catch (err) {
    console.error("Erreur adminUpdateReportStatus:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du signalement" });
  }
};

// Supprimer un signalement (admin)
export const adminDeleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findByPk(reportId);

    if (!report) {
      return res.status(404).json({ error: "Signalement introuvable" });
    }

    await report.destroy();

    res.json({ message: "Signalement supprimé avec succès" });
  } catch (err) {
    console.error("Erreur adminDeleteReport:", err);
    res.status(500).json({ error: "Erreur lors de la suppression du signalement" });
  }
};

// Obtenir des statistiques sur les signalements (admin)
export const adminGetReportsStats = async (req, res) => {
  try {
    const totalReports = await Report.count();
    const pendingReports = await Report.count({ where: { status: 'pending' } });
    const reviewedReports = await Report.count({ where: { status: 'reviewed' } });
    const resolvedReports = await Report.count({ where: { status: 'resolved' } });
    const dismissedReports = await Report.count({ where: { status: 'dismissed' } });

    // Top 10 des utilisateurs les plus signalés
    const mostReportedUsers = await Report.findAll({
      attributes: [
        'reported_user_id',
        [User.sequelize.fn('COUNT', User.sequelize.col('reported_user_id')), 'reportCount']
      ],
      include: [
        {
          model: User,
          as: 'ReportedUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      group: ['reported_user_id', 'ReportedUser.id'],
      order: [[User.sequelize.literal('COUNT("reported_user_id")'), 'DESC']],
      limit: 10
    });

    res.json({
      total: totalReports,
      pending: pendingReports,
      reviewed: reviewedReports,
      resolved: resolvedReports,
      dismissed: dismissedReports,
      mostReportedUsers
    });
  } catch (err) {
    console.error("Erreur adminGetReportsStats:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
  }
};
