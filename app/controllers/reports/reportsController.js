// controllers/reports/reportsController.js
import { Report, User, Profile } from "../../models/index.js";

export const createReport = async (req, res) => {
  try {
    const { reportedUserId, reason, message } = req.body;
    const reporterId = req.user.dbUser.id;

    // Vérifier que l'utilisateur ne se signale pas lui-même
    if (reporterId === reportedUserId) {
      return res.status(400).json({ error: "Vous ne pouvez pas vous signaler vous-même" });
    }

    // Vérifier que l'utilisateur signalé existe
    const reportedUser = await User.findByPk(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ error: "Utilisateur signalé introuvable" });
    }

    // Vérifier si un signalement existe déjà
    const existingReport = await Report.findOne({
      where: {
            reporter_id: reporterId,
        reported_user_id: reportedUserId,
        status: 'pending'
      }
    });

    if (existingReport) {
      return res.status(409).json({ error: "Vous avez déjà signalé cet utilisateur" });
    }

    const report = await Report.create({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      message,
      status: 'pending'
    });

    res.status(201).json({
      message: "Signalement créé avec succès",
      report
    });
  } catch (err) {
    console.error("Erreur createReport:", err);
    res.status(500).json({ error: "Erreur lors de la création du signalement" });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const userId = req.user.dbUser.id;

    const reports = await Report.findAll({
      where: { reporter_id: userId },
      include: [
        {
          model: User,
          as: 'ReportedUser',
          attributes: ['id', 'name', 'email'],
          include: [{
            model: Profile,
            attributes: ['biography', 'city', 'country']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(reports);
  } catch (err) {
    console.error("Erreur getMyReports:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des signalements" });
  }
};

export const deleteMyReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.dbUser.id;

    const report = await Report.findOne({
      where: {
        id: reportId,
        reporter_id: userId
      }
    });

    if (!report) {
      return res.status(404).json({ error: "Signalement introuvable" });
    }

    // Empêcher la suppression si déjà traité
    if (report.status !== 'pending') {
      return res.status(403).json({ error: "Impossible de supprimer un signalement déjà traité" });
    }

    await report.destroy();

    res.json({ message: "Signalement supprimé avec succès" });
  } catch (err) {
    console.error("Erreur deleteMyReport:", err);
    res.status(500).json({ error: "Erreur lors de la suppression du signalement" });
  }
};
