/**
 * Maps internal backend assignmentType enums to human-readable labels
 * - dept_role -> "Group & Role"
 * - specific / individual -> "Individual Learners"
 * - auto / mandatory -> "All Learners (Automatic)"
 */
export const formatAssignmentType = (type) => {
  if (!type) return 'Unknown Target';
  const lower = String(type).toLowerCase();
  if (lower === 'dept_role') return 'Group & Role';
  if (lower === 'specific' || lower === 'individual') return 'Individual Learners';
  if (lower === 'auto' || lower === 'mandatory') return 'All Learners (Automatic)';
  return type;
};

/**
 * Formats date strings to clean readable date e.g. "10 Sep 2026"
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Formats audit log timestamps to clean date & time e.g. "Aug 11, 2026 · 5:59 PM"
 */
export const formatAuditDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateStr} · ${timeStr}`;
};

/**
 * Utility to format user-facing text references of Employee/Employees to Learner/Learners.
 * Preserves sentence casing and word boundaries.
 */
export const formatDisplayText = (text) => {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/\bEmployees\b/g, 'Learners')
    .replace(/\bEmployee\b/g, 'Learner')
    .replace(/\bemployees\b/g, 'learners')
    .replace(/\bemployee\b/g, 'learner')
    .replace(/\bEMPLOYEES\b/g, 'LEARNERS')
    .replace(/\bEMPLOYEE\b/g, 'LEARNER');
};

/**
 * Maps backend audit action enums to human-readable titles
 */
export const formatAuditAction = (action) => {
  if (!action) return 'System Activity';
  const raw = String(action).trim();

  const actionMap = {
    CHANGE_PASSWORD: 'Change Password',
    CREATE_USER: 'Create User',
    UPDATE_USER: 'Update User',
    DELETE_USER: 'Delete User',
    REACTIVATE_AUTO_ASSIGNMENT_RULE: 'Reactivate Auto-Assignment Rule',
    DEACTIVATE_AUTO_ASSIGNMENT_RULE: 'Deactivate Auto-Assignment Rule',
    CREATE_AUTO_ASSIGNMENT_RULE: 'Create Auto-Assignment Rule',
    CREATE_TRAINING: 'Create Training',
    UPDATE_TRAINING: 'Update Training',
    DELETE_TRAINING: 'Delete Training',
    CREATE_EMPLOYEE: 'Create Learner',
    UPDATE_EMPLOYEE: 'Update Learner',
    DELETE_EMPLOYEE: 'Delete Learner',
    EMPLOYEE_CREATED: 'Learner Created',
    EMPLOYEE_UPDATED: 'Learner Updated',
    EMPLOYEE_DELETED: 'Learner Deleted',
    EMPLOYEE_ACTIVATED: 'Learner Activated',
    EMPLOYEE_DEACTIVATED: 'Learner Deactivated',
    EMPLOYEE_ASSIGNED: 'Learner Assigned',
    EMPLOYEE_ASSIGNED_TRAINING: 'Learner Assigned Training',
    EMPLOYEE_COMPLETED_TRAINING: 'Learner Completed Training',
    CREATE_INSTRUCTOR: 'Create Instructor',
    UPDATE_INSTRUCTOR: 'Update Instructor',
    DELETE_INSTRUCTOR: 'Delete Instructor',
    ASSIGN_TRAINING: 'Assign Training',
    SUBMIT_ASSIGNMENT: 'Submit Assignment',
    REVIEW_ASSIGNMENT: 'Review Assignment',
    LOCK_TRAINING: 'Lock Training Access',
    UNLOCK_TRAINING: 'Unlock Training Access',
    EXTEND_DEADLINE: 'Extend Training Deadline',
    LOGIN_SUCCESS: 'Successful Login',
    LOGIN_FAILED: 'Failed Login',
    SETUP_ORG: 'Organization Setup',
    CREATE_DEPARTMENT: 'Create Group',
    UPDATE_DEPARTMENT: 'Update Group',
    DELETE_DEPARTMENT: 'Delete Group'
  };

  let result = actionMap[raw];

  if (!result) {
    // Fallback formatter: convert ALL_CAPS_UNDERSCORE to Title Case
    result = raw
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return formatDisplayText(result);
};

/**
 * Maps database model names to human-readable target entity titles
 */
export const formatTargetEntity = (targetType) => {
  if (!targetType) return 'General Resource';
  const raw = String(targetType).trim();

  const entityMap = {
    AutoAssignmentRule: 'Auto-Assignment Rule',
    TrainingAssignment: 'Training Assignment',
    AssignmentSubmission: 'Assignment Submission',
    Training: 'Training Course',
    User: 'User Profile',
    Department: 'Group',
    Category: 'Training Category',
    Organization: 'Organization',
    Employee: 'Learner',
    Employees: 'Learners'
  };

  let result = entityMap[raw];

  if (!result) {
    // Fallback: split CamelCase into spaced words
    result = raw.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  return formatDisplayText(result);
};


