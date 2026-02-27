const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { syncGmailForUser } = require("../services/gmailSyncService");

router.post("/gmail", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  const result = await syncGmailForUser(userId);

  if (!result.ok) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

module.exports = router;
