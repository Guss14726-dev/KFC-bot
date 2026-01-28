import { Router } from "express";
import { promoteUser, demoteUser, setUserRankByName, fetchGroupRankChanges } from "../roblox";

const router = Router();
const cookie = process.env.ROBLOX_COOKIE!;
const groupId = process.env.GROUP_ID!;

router.get("/promote/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!userId) return res.status(400).json({ message: "Invalid user ID" });

  const result = await promoteUser(groupId, userId, cookie);
  res.json(result);
});

router.get("/demote/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const result = await demoteUser(groupId, userId, cookie);
  res.json(result);
});

router.get("/rank/:userId/:rankName", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const rankName = req.params.rankName;
  const result = await setUserRankByName(groupId, userId, rankName, cookie);
  res.json(result);
});

router.get("/logs", async (_req, res) => {
  const logs = await fetchGroupRankChanges(groupId, cookie);
  res.json(logs);
});

export default router;
