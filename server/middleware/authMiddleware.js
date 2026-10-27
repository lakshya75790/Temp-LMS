const jwt = require('jsonwebtoken');
const { withId } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');
const { getCachedOrgLicenseValidity } = require('../services/licenseService');

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, token missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      throw new ApiError(401, 'Invalid authentication token');
    }

    req.user = withId({
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
      organizationId: decoded.organizationId
    });

    if (req.user.role !== 'SuperAdmin' && req.user.organizationId) {
      const orgId = typeof req.user.organizationId === 'object'
        ? (req.user.organizationId.id || req.user.organizationId._id)
        : req.user.organizationId;

      if (orgId) {
        const validity = await getCachedOrgLicenseValidity(orgId);
        if (!validity.isValid) {
          const err = new ApiError(403, validity.message);
          err.errorCode = validity.errorCode;
          throw err;
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect };
