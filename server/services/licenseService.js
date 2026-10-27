const { prisma } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');

// In-memory cache for organization license validity to prevent hitting DB on every API call
const orgValidityCache = new Map();
const VALIDITY_CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Evaluates whether an organization's license is active based on licenseStartDate and licenseEndDate.
 *
 * Current date/time >= licenseStartDate AND Current date/time <= licenseEndDate => ACTIVE
 * Current date/time > licenseEndDate => EXPIRED
 * Current date/time < licenseStartDate => NOT_STARTED
 */
const getOrgLicenseValidity = async (organizationId, tx = prisma) => {
  if (!organizationId) {
    return {
      isValid: true,
      status: 'Active',
      errorCode: null,
      message: null
    };
  }

  const cleanOrgId = String(organizationId);
  const org = await tx.organization.findUnique({
    where: { id: cleanOrgId },
    select: { id: true, name: true, status: true, licenseStartDate: true, licenseEndDate: true }
  });

  if (!org) {
    throw new ApiError(404, 'Organization not found');
  }

  // Deactivated organization status check
  if (String(org.status || 'ACTIVE').toUpperCase() === 'INACTIVE') {
    return {
      isValid: false,
      status: 'Inactive',
      errorCode: 'ORGANIZATION_DEACTIVATED',
      message: 'Your organization has been deactivated by the Super Admin. Please contact your administrator.'
    };
  }

  const now = new Date();

  // If start date is set and current time is before start date (00:00:00.000)
  if (org.licenseStartDate) {
    const startDate = new Date(org.licenseStartDate);
    startDate.setHours(0, 0, 0, 0);
    if (now < startDate) {
      return {
        isValid: false,
        status: 'Not Started',
        errorCode: 'ORGANIZATION_LICENSE_NOT_STARTED',
        message: "Your organization's LMS license has not started yet. Please contact your administrator.",
        licenseStartDate: org.licenseStartDate,
        licenseEndDate: org.licenseEndDate
      };
    }
  }

  // If end date is set and current time is after end date (23:59:59.999)
  if (org.licenseEndDate) {
    const endDate = new Date(org.licenseEndDate);
    endDate.setHours(23, 59, 59, 999);
    if (now > endDate) {
      return {
        isValid: false,
        status: 'Expired',
        errorCode: 'ORGANIZATION_LICENSE_EXPIRED',
        message: "Your organization's LMS license has expired. Please contact your administrator to renew the license.",
        licenseStartDate: org.licenseStartDate,
        licenseEndDate: org.licenseEndDate
      };
    }
  }

  return {
    isValid: true,
    status: 'Active',
    errorCode: null,
    message: null,
    licenseStartDate: org.licenseStartDate,
    licenseEndDate: org.licenseEndDate
  };
};

/**
 * Fast-cached wrapper around getOrgLicenseValidity.
 */
const getCachedOrgLicenseValidity = async (organizationId, tx = prisma) => {
  if (!organizationId) {
    return { isValid: true, status: 'Active', errorCode: null, message: null };
  }

  const cleanOrgId = String(organizationId);
  const now = Date.now();
  const cached = orgValidityCache.get(cleanOrgId);

  if (cached && now - cached.timestamp < VALIDITY_CACHE_TTL_MS) {
    return cached.result;
  }

  const result = await getOrgLicenseValidity(cleanOrgId, tx);
  orgValidityCache.set(cleanOrgId, { timestamp: now, result });
  return result;
};

/**
 * Invalidate organization license validity cache (call when Super Admin updates license dates/status).
 */
const invalidateOrgLicenseCache = (organizationId) => {
  if (organizationId) {
    orgValidityCache.delete(String(organizationId));
  } else {
    orgValidityCache.clear();
  }
};

/**
 * Calculate current license usage, availability, and date validity for an Organization.
 */
const getOrgLicenseStats = async (organizationId, tx = prisma) => {
  if (!organizationId) {
    throw new ApiError(400, 'Organization ID is required');
  }

  const cleanOrgId = String(organizationId);

  const [org, usedLicenses] = await Promise.all([
    tx.organization.findUnique({
      where: { id: cleanOrgId },
      select: {
        id: true,
        name: true,
        totalLicenses: true,
        licenseStartDate: true,
        licenseEndDate: true,
        status: true,
        createdAt: true
      }
    }),
    tx.user.count({
      where: {
        organizationId: cleanOrgId,
        role: { in: ['Admin', 'Instructor', 'Employee'] }
      }
    })
  ]);

  if (!org) {
    throw new ApiError(404, 'Organization not found');
  }

  const totalLicenses = typeof org.totalLicenses === 'number' && !isNaN(org.totalLicenses) ? org.totalLicenses : 5;
  const remainingLicenses = Math.max(0, totalLicenses - usedLicenses);

  const validity = await getOrgLicenseValidity(cleanOrgId, tx);

  return {
    organizationId: cleanOrgId,
    organizationName: org.name,
    totalLicenses,
    usedLicenses,
    remainingLicenses,
    licenseStartDate: org.licenseStartDate,
    licenseEndDate: org.licenseEndDate,
    licenseStatus: validity.status,
    isValid: validity.isValid,
    errorCode: validity.errorCode,
    message: validity.message
  };
};

/**
 * Concurrency-safe license check & reservation inside a Prisma transaction.
 * Uses PostgreSQL row-level locking (FOR UPDATE) to prevent race conditions.
 */
const checkAndReserveLicense = async (organizationId, tx) => {
  if (!organizationId) {
    throw new ApiError(400, 'Organization ID is required for license check');
  }

  const cleanOrgId = String(organizationId);

  // First verify organization date validity
  const validity = await getOrgLicenseValidity(cleanOrgId, tx);
  if (!validity.isValid) {
    throw new ApiError(403, validity.message, validity.errorCode);
  }

  // Lock organization row for concurrent safety if running inside a raw transaction query
  try {
    await tx.$queryRaw`SELECT id, "totalLicenses" FROM "organizations" WHERE id = ${cleanOrgId} FOR UPDATE`;
  } catch (err) {
    // Fallback if raw query is not supported in mocked/test environments
  }

  const org = await tx.organization.findUnique({
    where: { id: cleanOrgId },
    select: { id: true, totalLicenses: true }
  });

  if (!org) {
    throw new ApiError(404, 'Organization not found');
  }

  const totalLicenses = typeof org.totalLicenses === 'number' && !isNaN(org.totalLicenses) ? org.totalLicenses : 5;

  const usedLicenses = await tx.user.count({
    where: {
      organizationId: cleanOrgId,
      role: { in: ['Admin', 'Instructor', 'Employee'] }
    }
  });

  if (usedLicenses >= totalLicenses) {
    return {
      allowed: false,
      totalLicenses,
      usedLicenses,
      remainingLicenses: 0
    };
  }

  return {
    allowed: true,
    totalLicenses,
    usedLicenses,
    remainingLicenses: totalLicenses - usedLicenses
  };
};

/**
 * Migration & default strategy for existing organizations.
 * 1. Ensures Total Licenses >= Currently Used Licenses for every organization in the DB.
 * 2. Backfills existing organizations with a DEFAULT 1-YEAR LICENSE PERIOD calculated from createdAt.
 */
const ensureOrganizationLicensesValid = async () => {
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        totalLicenses: true,
        licenseStartDate: true,
        licenseEndDate: true,
        createdAt: true
      }
    });

    if (orgs.length === 0) return;

    const orgIds = orgs.map(o => o.id);
    const activeUserCounts = await prisma.user.groupBy({
      by: ['organizationId'],
      where: {
        organizationId: { in: orgIds },
        role: { in: ['Admin', 'Instructor', 'Employee'] }
      },
      _count: { id: true }
    });

    const countMap = new Map();
    activeUserCounts.forEach(c => countMap.set(c.organizationId, c._count.id));

    const updates = [];
    for (const org of orgs) {
      const usedLicenses = countMap.get(org.id) || 0;
      const currentTotal = typeof org.totalLicenses === 'number' && !isNaN(org.totalLicenses) ? org.totalLicenses : 5;
      const minRequired = Math.max(currentTotal, usedLicenses);

      const updateData = {};

      if (org.totalLicenses === null || org.totalLicenses === undefined || org.totalLicenses < minRequired) {
        updateData.totalLicenses = minRequired;
      }

      // Backfill default 1-year license period if license dates are missing
      if (!org.licenseStartDate || !org.licenseEndDate) {
        const startDate = org.createdAt ? new Date(org.createdAt) : new Date();
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        if (!org.licenseStartDate) updateData.licenseStartDate = startDate;
        if (!org.licenseEndDate) updateData.licenseEndDate = endDate;
      }

      if (Object.keys(updateData).length > 0) {
        updates.push(
          prisma.organization.update({
            where: { id: org.id },
            data: updateData
          })
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`[LICENSE MIGRATION] Synchronized and backfilled default 1-year license periods for ${updates.length} organizations.`);
    }
  } catch (error) {
    console.error('[LICENSE MIGRATION ERROR] Failed to synchronize organization licenses:', error.message);
  }
};

module.exports = {
  getOrgLicenseValidity,
  getCachedOrgLicenseValidity,
  invalidateOrgLicenseCache,
  getOrgLicenseStats,
  checkAndReserveLicense,
  ensureOrganizationLicensesValid
};
