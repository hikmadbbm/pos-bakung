import { prisma } from './prisma';

/**
 * Logs a sensitive user activity to the database.
 * 
 * @param {Object} params
 * @param {number} params.userId - The ID of the user performing the action
 * @param {string} params.action - The action name (e.g., DELETE_ORDER)
 * @param {string} params.entity - The entity being affected (e.g., ORDER)
 * @param {string} [params.entityId] - The ID of the specific entity (optional)
 * @param {Object} [params.details] - JSON details (e.g., { before, after })
 * @param {string} [params.ipAddress] - IP address of the user
 */
export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress
}) {
  try {
    await prisma.userActivityLog.create({
      data: {
        user_id: userId,
        action,
        entity,
        entity_id: entityId ? String(entityId) : null,
        details: details || {},
        ip_address: ipAddress || null
      }
    });
  } catch (error) {
    // We log but don't throw to prevent audit logging from breaking main business logic
    console.error('FAILED TO LOG USER ACTIVITY:', error);
  }
}
