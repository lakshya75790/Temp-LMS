/**
 * Domain-Neutral Terminology Layer
 * 
 * Supports:
 * - Company / Organization (Department -> Job Role -> Employee)
 * - School (Class / Section -> Role -> Student)
 * - College (Department / Semester -> Role -> Student)
 * - Coaching / Training Institute (Batch -> Role -> Student)
 */

export const TERMINOLOGY = {
  learner: 'Learner',
  learners: 'Learners',
  group: 'Group',
  groups: 'Groups',
  role: 'Role',
  roles: 'Roles',
  assignmentEngine: 'Training Assignment Engine',
  automaticAssignment: 'Automatic Training Assignment',
  targetedAssignment: 'Targeted Training Assignment',
  groupRoleMatch: 'Group & Role Match',
  individualSelection: 'Individual Learner Selection'
};

export const DOMAIN_PRESETS = {
  organization: {
    groupLabel: 'Department',
    roleLabel: 'Job Role',
    learnerLabel: 'Employee',
    examples: ['Engineering → Software Developer', 'Marketing → Marketing Executive', 'Finance → Accountant']
  },
  school: {
    groupLabel: 'Class / Section',
    roleLabel: 'Role',
    learnerLabel: 'Student',
    examples: ['Class 10-A → Student', 'Class 12-B → Student']
  },
  college: {
    groupLabel: 'Department / Semester',
    roleLabel: 'Role',
    learnerLabel: 'Student',
    examples: ['CSE Semester 5 → Student', 'ECE Year 3 → Student']
  },
  coaching: {
    groupLabel: 'Batch',
    roleLabel: 'Role',
    learnerLabel: 'Student',
    examples: ['JEE 2027 Morning Batch → Student', 'NEET Evening Batch → Student']
  }
};
