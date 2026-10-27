/**
 * Utility for exporting real LMS reports to CSV format
 */

const downloadCSV = (filename, csvContent) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportEmployeeProgressReport = (employees) => {
  let csv = 'Learner Name,Email,Group,Role,Total Assigned,Completed,In Progress,Pending,Overdue,Compliance Rate (%),Overall Progress (%)\n';
  employees.forEach(e => {
    const groupName = e.departmentName && e.departmentName !== 'Unassigned' ? e.departmentName : 'No Group Assigned';
    const roleName = e.jobRole && e.jobRole !== 'Unassigned' ? e.jobRole : 'No Role Assigned';
    csv += `"${e.name}","${e.email}","${groupName}","${roleName}",${e.totalAssigned},${e.completed},${e.inProgress},${e.pending},${e.overdue},${e.complianceRate},${e.overallProgress}\n`;
  });
  downloadCSV(`Learner_Progress_Report_${Date.now()}.csv`, csv);
};

export const exportDepartmentComplianceReport = (departments) => {
  let csv = 'Group Name,Total Learners,Total Roles,Total Assigned,Completed,In Progress,Pending,Overdue,Compliance Rate (%)\n';
  departments.forEach(d => {
    csv += `"${d.departmentName}",${d.totalEmployees},${d.totalRoles || 0},${d.totalAssigned},${d.completed},${d.inProgress},${d.pending},${d.overdue},${d.complianceRate}\n`;
  });
  downloadCSV(`Group_Compliance_Report_${Date.now()}.csv`, csv);
};

export const exportTrainingAnalyticsReport = (trainings) => {
  let csv = 'Course Name,Category,Compulsory,Total Assigned,Completed,In Progress,Pending,Overdue,Completion Rate (%),Avg Progress (%)\n';
  trainings.forEach(t => {
    csv += `"${t.title}","${t.categoryName || 'General'}",${t.isMandatory ? 'Yes' : 'No'},${t.totalAssigned},${t.completed},${t.inProgress},${t.pending},${t.overdue},${t.completionRate},${t.avgProgress}\n`;
  });
  downloadCSV(`Course_Completion_Report_${Date.now()}.csv`, csv);
};

export const exportOverdueReport = (overdueItems) => {
  let csv = 'Learner Name,Email,Group,Role,Course Name,Deadline,Days Overdue,Progress (%),Assigned By\n';
  overdueItems.forEach(o => {
    const groupName = o.departmentName && o.departmentName !== 'Unassigned' ? o.departmentName : 'No Group Assigned';
    const roleName = o.jobRole && o.jobRole !== 'Unassigned' ? o.jobRole : 'No Role Assigned';
    csv += `"${o.employeeName}","${o.employeeEmail}","${groupName}","${roleName}","${o.trainingTitle}","${new Date(o.deadline).toLocaleDateString()}",${o.daysOverdue},${o.currentProgress},"${o.assignedBy}"\n`;
  });
  downloadCSV(`Overdue_Training_Assignments_Report_${Date.now()}.csv`, csv);
};

export const exportFullOrgReport = (data) => {
  let csv = '=== ORGANIZATIONAL SUMMARY ===\n';
  const ov = data.overview || {};
  csv += `Total Learners,${ov.totalEmployees || 0}\n`;
  csv += `Total Groups,${ov.totalDepartments || 0}\n`;
  csv += `Published Courses,${ov.totalActiveTrainings || 0}\n`;
  csv += `Total Assignments,${ov.totalAssignments || 0}\n`;
  csv += `Completed Assignments,${ov.completedAssignments || 0}\n`;
  csv += `In Progress Assignments,${ov.inProgressAssignments || 0}\n`;
  csv += `Pending Assignments,${ov.pendingAssignments || 0}\n`;
  csv += `Overdue Assignments,${ov.overdueAssignments || 0}\n`;
  csv += `Overall Compliance Rate,${ov.overallComplianceRate || 0}%\n\n`;

  csv += '=== GROUP COMPLIANCE ===\n';
  csv += 'Group Name,Learners,Assigned,Completed,In Progress,Pending,Overdue,Compliance Rate (%)\n';
  (data.departmentAnalytics || []).forEach(d => {
    csv += `"${d.departmentName}",${d.totalEmployees},${d.totalAssigned},${d.completed},${d.inProgress},${d.pending},${d.overdue},${d.complianceRate}\n`;
  });

  csv += '\n=== LEARNER PROGRESS ===\n';
  csv += 'Learner Name,Email,Group,Role,Assigned,Completed,In Progress,Pending,Overdue,Overall Progress (%)\n';
  (data.employeeAnalytics || []).forEach(e => {
    csv += `"${e.name}","${e.email}","${e.departmentName}","${e.jobRole}",${e.totalAssigned},${e.completed},${e.inProgress},${e.pending},${e.overdue},${e.overallProgress}\n`;
  });

  downloadCSV(`Full_LMS_Organization_Report_${Date.now()}.csv`, csv);
};

