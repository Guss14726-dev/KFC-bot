// roblox.ts
import axios from "axios";

// ---------------- TYPES ----------------

export interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
}

export interface Role {
  id: number;
  name: string;
  rank: number;
}

export interface AuditLogEntry {
  id: string;
  actionType: string;
  actor: {
    user?: RobloxUser;
  };
  description: {
    TargetId?: number;
    TargetName?: string;
    OldRoleSetId?: number;
    NewRoleSetId?: number;
  };
  created: string;
}

// ---------------- CACHES ----------------

// Cache usernames
const userCache = new Map<number, string>();

// Cache roles per group
const groupRolesCache: Record<string, Role[]> = {};

// ---------------- ROBLOX API ----------------

// Get CSRF token for authenticated requests
async function getCsrfToken(cookie: string): Promise<string> {
  try {
    await axios.post("https://auth.roblox.com/v2/logout", {}, {
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
      },
    });
    return "";
  } catch (err: any) {
    const token = err.response?.headers?.["x-csrf-token"];
    if (token) return token;
    throw new Error("Failed to get CSRF token");
  }
}

// Fetch group rank change audit logs
export async function fetchGroupRankChanges(groupId: string, cookie: string): Promise<AuditLogEntry[]> {
  try {
    const url = `https://groups.roblox.com/v1/groups/${groupId}/audit-log?actionType=ChangeRank&limit=10&sortOrder=Desc`;

    const res = await axios.get(url, {
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
      },
      timeout: 10000,
    });

    return res.data.data as AuditLogEntry[];
  } catch (err: any) {
    console.error(
      `❌ Roblox audit log error (${groupId}):`,
      err.response?.status,
      err.response?.data || err.message
    );
    return [];
  }
}

// Get Roblox username (cached)
export async function getUserInfo(userId: number): Promise<{ username: string }> {
  if (userCache.has(userId)) {
    return { username: userCache.get(userId)! };
  }

  try {
    const res = await axios.get(`https://users.roblox.com/v1/users/${userId}`, {
      timeout: 10000,
    });

    const username = res.data.name || "Unknown";
    userCache.set(userId, username);

    return { username };
  } catch {
    return { username: "Unknown" };
  }
}

// Get user ID from username
export async function getUserIdFromUsername(username: string): Promise<number | null> {
  try {
    const res = await axios.post("https://users.roblox.com/v1/usernames/users", {
      usernames: [username],
      excludeBannedUsers: false,
    }, {
      timeout: 10000,
    });

    const data = res.data.data;
    if (data && data.length > 0) {
      return data[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch group roles (cached)
export async function getGroupRoles(groupId: string): Promise<Role[]> {
  if (groupRolesCache[groupId]) {
    return groupRolesCache[groupId];
  }

  try {
    const res = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/roles`, {
      timeout: 10000,
    });

    const roles = res.data.roles as Role[];
    groupRolesCache[groupId] = roles;

    return roles;
  } catch (err: any) {
    console.error(
      `❌ Roblox roles error (${groupId}):`,
      err.response?.status,
      err.response?.data || err.message
    );
    return [];
  }
}

// Get a user's current role in a group
export async function getUserRoleInGroup(groupId: string, userId: number): Promise<Role | null> {
  try {
    const res = await axios.get(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, {
      timeout: 10000,
    });

    const groups = res.data.data;
    const group = groups.find((g: any) => g.group.id === parseInt(groupId));
    
    if (group) {
      return group.role as Role;
    }
    return null;
  } catch {
    return null;
  }
}

// Set a user's rank in a group
export async function setUserRank(groupId: string, userId: number, roleId: number, cookie: string): Promise<{ success: boolean; error?: string }> {
  try {
    const csrfToken = await getCsrfToken(cookie);

    await axios.patch(
      `https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`,
      { roleId },
      {
        headers: {
          Cookie: `.ROBLOSECURITY=${cookie}`,
          "X-CSRF-TOKEN": csrfToken,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    return { success: true };
  } catch (err: any) {
    const errorMessage = err.response?.data?.errors?.[0]?.message || err.message || "Unknown error";
    console.error(`❌ Set rank error:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Promote user to next rank
export async function promoteUser(groupId: string, userId: number, cookie: string): Promise<{ success: boolean; oldRole?: string; newRole?: string; error?: string }> {
  const roles = await getGroupRoles(groupId);
  if (roles.length === 0) {
    return { success: false, error: "Could not fetch group roles" };
  }

  const currentRole = await getUserRoleInGroup(groupId, userId);
  if (!currentRole) {
    return { success: false, error: "User is not in this group" };
  }

  // Sort roles by rank ascending
  const sortedRoles = roles.sort((a, b) => a.rank - b.rank);
  const currentIndex = sortedRoles.findIndex(r => r.id === currentRole.id);

  if (currentIndex === -1) {
    return { success: false, error: "Could not find current role" };
  }

  if (currentIndex >= sortedRoles.length - 1) {
    return { success: false, error: "User is already at the highest rank" };
  }

  const nextRole = sortedRoles[currentIndex + 1];
  const result = await setUserRank(groupId, userId, nextRole.id, cookie);

  if (result.success) {
    return { success: true, oldRole: currentRole.name, newRole: nextRole.name };
  }
  return { success: false, error: result.error };
}

// Demote user to previous rank
export async function demoteUser(groupId: string, userId: number, cookie: string): Promise<{ success: boolean; oldRole?: string; newRole?: string; error?: string }> {
  const roles = await getGroupRoles(groupId);
  if (roles.length === 0) {
    return { success: false, error: "Could not fetch group roles" };
  }

  const currentRole = await getUserRoleInGroup(groupId, userId);
  if (!currentRole) {
    return { success: false, error: "User is not in this group" };
  }

  // Sort roles by rank ascending
  const sortedRoles = roles.sort((a, b) => a.rank - b.rank);
  const currentIndex = sortedRoles.findIndex(r => r.id === currentRole.id);

  if (currentIndex === -1) {
    return { success: false, error: "Could not find current role" };
  }

  if (currentIndex <= 0) {
    return { success: false, error: "User is already at the lowest rank" };
  }

  const prevRole = sortedRoles[currentIndex - 1];
  const result = await setUserRank(groupId, userId, prevRole.id, cookie);

  if (result.success) {
    return { success: true, oldRole: currentRole.name, newRole: prevRole.name };
  }
  return { success: false, error: result.error };
}

// Set user to a specific rank by name
export async function setUserRankByName(groupId: string, userId: number, rankName: string, cookie: string): Promise<{ success: boolean; oldRole?: string; newRole?: string; error?: string }> {
  const roles = await getGroupRoles(groupId);
  if (roles.length === 0) {
    return { success: false, error: "Could not fetch group roles" };
  }

  // Find role by name (case-insensitive)
  const targetRole = roles.find(r => r.name.toLowerCase() === rankName.toLowerCase());
  if (!targetRole) {
    const availableRoles = roles.map(r => r.name).join(", ");
    return { success: false, error: `Role "${rankName}" not found. Available roles: ${availableRoles}` };
  }

  const currentRole = await getUserRoleInGroup(groupId, userId);
  if (!currentRole) {
    return { success: false, error: "User is not in this group" };
  }

  if (currentRole.id === targetRole.id) {
    return { success: false, error: `User is already ${targetRole.name}` };
  }

  const result = await setUserRank(groupId, userId, targetRole.id, cookie);

  if (result.success) {
    return { success: true, oldRole: currentRole.name, newRole: targetRole.name };
  }
  return { success: false, error: result.error };
}

// Optional: clear caches (debug/admin use)
export function clearRobloxCache() {
  userCache.clear();
  for (const key in groupRolesCache) delete groupRolesCache[key];
}
