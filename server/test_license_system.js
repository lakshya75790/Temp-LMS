require('dotenv').config();
const { prisma } = require('./config/prismaClient');
const bcrypt = require('bcryptjs');
const { getOrgLicenseStats, checkAndReserveLicense, ensureOrganizationLicensesValid } = require('./services/licenseService');
const { createOrganization, updateOrganization } = require('./controllers/superAdminController');
const { createInstructor, updateUserStatus, deleteUser } = require('./controllers/orgController');
const { registerEmployee } = require('./controllers/authController');

let mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  res.cookie = () => res;
  return res;
};

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('STARTING LICENSE SYSTEM INTEGRATION TESTS');
  console.log('----------------------------------------------------');

  const realSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SuperAdmin' }
  });

  const superAdminUser = realSuperAdmin || { id: 'super-admin-test-id', name: 'Test Super Admin', role: 'SuperAdmin' };
  const testOrgCode = `LIC-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const testAdminEmail = `lic_admin_${Date.now()}@test.com`;

  let testOrgId;
  let testOrgAdminId;

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Super Admin -> Create Organization
    // ----------------------------------------------------
    console.log('\n[TEST 1] Creating new Organization with Total Licenses = 5...');
    const reqCreateOrg = {
      body: {
        name: 'License Test Org',
        code: testOrgCode,
        description: 'Test Org for License System',
        totalLicenses: 5,
        adminName: 'Test Org Admin',
        adminEmail: testAdminEmail,
        adminPassword: 'Password123!',
        licenseStartDate: new Date().toISOString(),
        licenseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      user: superAdminUser
    };
    const resCreateOrg = mockRes();
    await createOrganization(reqCreateOrg, resCreateOrg, (err) => { throw err; });

    const createdOrg = resCreateOrg.body.data.organization;
    testOrgId = createdOrg.id;
    testOrgAdminId = resCreateOrg.body.data.adminUser.id;

    const stats1 = await getOrgLicenseStats(testOrgId);
    console.log('Org Stats 1:', stats1);
    if (stats1.totalLicenses === 5 && stats1.usedLicenses === 1 && stats1.remainingLicenses === 4) {
      console.log('✅ TEST 1 PASSED: New Organization created with 5 total licenses, 1 consumed by Org Admin, 4 remaining.');
    } else {
      throw new Error(`TEST 1 FAILED: Expected total 5, used 1, remaining 4. Got ${JSON.stringify(stats1)}`);
    }

    // ----------------------------------------------------
    // TEST CASE 2: Fill Usage to 5 (Full Usage) & Verify Blocking
    // ----------------------------------------------------
    console.log('\n[TEST 2] Filling remaining 4 licenses (Creating 3 Instructors + 1 Employee)...');
    const orgAdminUser = {
      id: testOrgAdminId,
      name: 'Test Org Admin',
      role: 'Admin',
      organizationId: testOrgId
    };

    for (let i = 1; i <= 3; i++) {
      const reqInst = {
        body: {
          name: `Instructor ${i}`,
          email: `inst_${i}_${Date.now()}@test.com`,
          password: 'Password123!'
        },
        user: orgAdminUser
      };
      const resInst = mockRes();
      await createInstructor(reqInst, resInst, (err) => { throw err; });
    }

    // Register 1 employee to reach 5
    const reqEmp = {
      body: {
        name: 'Learner 1',
        email: `learner_1_${Date.now()}@test.com`,
        password: 'Password123!',
        orgCode: testOrgCode
      }
    };
    const resEmp = mockRes();
    await registerEmployee(reqEmp, resEmp, (err) => { throw err; });

    const stats2 = await getOrgLicenseStats(testOrgId);
    console.log('Org Stats 2 (Full Usage):', stats2);
    if (stats2.usedLicenses === 5 && stats2.remainingLicenses === 0) {
      console.log('✅ Full usage reached: 5 / 5 licenses consumed.');
    } else {
      throw new Error(`Expected used 5, remaining 0. Got ${JSON.stringify(stats2)}`);
    }

    // Try creating 6th user (Instructor creation when 0 available) -> Must fail
    console.log('Attempting to create 6th user via Instructor Creation API...');
    let instructorBlockedPassed = false;
    const reqInst6 = {
      body: {
        name: 'Instructor 6 Overflow',
        email: `inst_6_overflow_${Date.now()}@test.com`,
        password: 'Password123!'
      },
      user: orgAdminUser
    };
    const resInst6 = mockRes();
    await createInstructor(reqInst6, resInst6, (err) => {
      console.log('Received expected Instructor block error:', err.message);
      if (err.statusCode === 400 && err.message === 'All available licenses have been used. Please contact your administrator to add more licenses.') {
        instructorBlockedPassed = true;
      }
    });

    if (!instructorBlockedPassed) {
      throw new Error('TEST 2 FAILED: Instructor creation was not blocked with exact error message.');
    }

    // Try registering employee when 0 available -> Must fail & trigger admin notification
    console.log('Attempting to register 6th user via Public Employee Registration API...');
    let employeeBlockedPassed = false;
    const reqEmp6 = {
      body: {
        name: 'Employee 6 Overflow',
        email: `emp_6_overflow_${Date.now()}@test.com`,
        password: 'Password123!',
        orgCode: testOrgCode
      }
    };
    const resEmp6 = mockRes();
    await registerEmployee(reqEmp6, resEmp6, (err) => {
      console.log('Received expected Employee registration block error:', err.message);
      if (err.statusCode === 400 && err.message === 'All available licenses have been used. Please contact your administrator to add more licenses.') {
        employeeBlockedPassed = true;
      }
    });

    if (!employeeBlockedPassed) {
      throw new Error('TEST 2 FAILED: Employee registration was not blocked with exact error message.');
    }

    console.log('✅ TEST 2 PASSED: At license limit, creating another record is rejected.');

    // ----------------------------------------------------
    // TEST CASE 3: Deactivating an Instructor does NOT decrease license usage
    // ----------------------------------------------------
    console.log('\n[TEST 3] Deactivating an instructor - verifying license slot is NOT freed...');
    const instructorsList = await prisma.user.findMany({
      where: { organizationId: testOrgId, role: 'Instructor', status: 'active' },
      take: 1
    });
    const targetInstructor = instructorsList[0];

    const reqDeactivate = {
      params: { id: targetInstructor.id },
      body: { status: 'deactivated' },
      user: orgAdminUser
    };
    const resDeactivate = mockRes();
    await updateUserStatus(reqDeactivate, resDeactivate, (err) => { throw err; });

    const stats3 = await getOrgLicenseStats(testOrgId);
    console.log('Org Stats 3 (After Instructor Deactivation):', stats3);
    if (stats3.usedLicenses === 5 && stats3.remainingLicenses === 0) {
      console.log('✅ TEST 3 PASSED: Deactivating an instructor did NOT free their license slot (Used: 5, Remaining: 0).');
    } else {
      throw new Error(`TEST 3 FAILED: Expected used 5, remaining 0. Got ${JSON.stringify(stats3)}`);
    }

    // ----------------------------------------------------
    // TEST CASE 4: Creating a new record after deactivation is STILL rejected when full
    // ----------------------------------------------------
    console.log('\n[TEST 4] Attempting to create new instructor while 1 instructor is inactive...');
    let createWhileInactiveBlocked = false;
    const reqInstWhileInactive = {
      body: {
        name: 'Instructor Bypass Attempt',
        email: `bypass_attempt_${Date.now()}@test.com`,
        password: 'Password123!'
      },
      user: orgAdminUser
    };
    const resInstWhileInactive = mockRes();
    await createInstructor(reqInstWhileInactive, resInstWhileInactive, (err) => {
      if (err.statusCode === 400 && err.message.includes('All available licenses have been used')) {
        createWhileInactiveBlocked = true;
      }
    });

    if (!createWhileInactiveBlocked) {
      throw new Error('TEST 4 FAILED: Creating new instructor when license is full (with an inactive user) was NOT rejected!');
    }
    console.log('✅ TEST 4 PASSED: Creating a new record after deactivation was strictly rejected.');

    // ----------------------------------------------------
    // TEST CASE 5: Reactivating existing inactive record does NOT increase usage or exceed limit
    // ----------------------------------------------------
    console.log('\n[TEST 5] Reactivating previously deactivated instructor...');
    const reqReactivate = {
      params: { id: targetInstructor.id },
      body: { status: 'active' },
      user: orgAdminUser
    };
    const resReactivate = mockRes();
    await updateUserStatus(reqReactivate, resReactivate, (err) => { throw err; });

    const stats5 = await getOrgLicenseStats(testOrgId);
    console.log('Org Stats 5 (After Reactivation):', stats5);
    if (stats5.usedLicenses === 5 && stats5.remainingLicenses === 0) {
      console.log('✅ TEST 5 PASSED: Reactivation did not increase usage or exceed limit (Used: 5, Remaining: 0).');
    } else {
      throw new Error(`TEST 5 FAILED: Expected used 5, remaining 0. Got ${JSON.stringify(stats5)}`);
    }

    // ----------------------------------------------------
    // TEST CASE 6: Failed Deletion due to dependencies does NOT release slot
    // ----------------------------------------------------
    console.log('\n[TEST 6] Testing data integrity: Instructor with created course cannot be deleted...');
    const testCategory = await prisma.trainingCategory.create({
      data: {
        name: `Test Cat ${Date.now()}`,
        organizationId: testOrgId
      }
    });

    const testTraining = await prisma.training.create({
      data: {
        title: 'Instructor Test Course',
        description: 'Testing instructor dependency integrity',
        categoryId: testCategory.id,
        createdBy: targetInstructor.id,
        organizationId: testOrgId
      }
    });

    let deleteBlockedForCourse = false;
    const reqDeleteWithCourse = {
      params: { id: targetInstructor.id },
      user: orgAdminUser
    };
    const resDeleteWithCourse = mockRes();
    await deleteUser(reqDeleteWithCourse, resDeleteWithCourse, (err) => {
      if (err.statusCode === 400 && err.message.includes('Cannot delete instructor because they are the creator')) {
        deleteBlockedForCourse = true;
      }
    });

    if (!deleteBlockedForCourse) {
      throw new Error('TEST 6 FAILED: Instructor with courses was not blocked from deletion!');
    }

    const stats6 = await getOrgLicenseStats(testOrgId);
    if (stats6.usedLicenses === 5) {
      console.log('✅ TEST 6 PASSED: Failed deletion did NOT release a license slot (Used: 5).');
    } else {
      throw new Error(`TEST 6 FAILED: License slot was released despite deletion failure! Used: ${stats6.usedLicenses}`);
    }

    // Clean up test training and category
    await prisma.training.delete({ where: { id: testTraining.id } });
    await prisma.trainingCategory.delete({ where: { id: testCategory.id } });

    // ----------------------------------------------------
    // TEST CASE 7: Permanent Deletion of Instructor Releases License Slot
    // ----------------------------------------------------
    console.log('\n[TEST 7] Permanently deleting instructor without courses...');
    const reqDeleteSuccess = {
      params: { id: targetInstructor.id },
      user: orgAdminUser
    };
    const resDeleteSuccess = mockRes();
    await deleteUser(reqDeleteSuccess, resDeleteSuccess, (err) => { throw err; });

    const stats7 = await getOrgLicenseStats(testOrgId);
    console.log('Org Stats 7 (After Instructor Permanent Deletion):', stats7);
    if (stats7.usedLicenses === 4 && stats7.remainingLicenses === 1) {
      console.log('✅ TEST 7 PASSED: Permanent deletion released license slot (Used: 4, Remaining: 1).');
    } else {
      throw new Error(`TEST 7 FAILED: Expected used 4, remaining 1. Got ${JSON.stringify(stats7)}`);
    }

    // ----------------------------------------------------
    // TEST CASE 8: Creating New Record after Permanent Deletion is Allowed
    // ----------------------------------------------------
    console.log('\n[TEST 8] Creating new instructor in the freed license slot...');
    const reqInstNew = {
      body: {
        name: 'New Replacement Instructor',
        email: `new_inst_${Date.now()}@test.com`,
        password: 'Password123!'
      },
      user: orgAdminUser
    };
    const resInstNew = mockRes();
    await createInstructor(reqInstNew, resInstNew, (err) => { throw err; });

    const stats8 = await getOrgLicenseStats(testOrgId);
    console.log('Org Stats 8 (After New Instructor Created):', stats8);
    if (stats8.usedLicenses === 5 && stats8.remainingLicenses === 0) {
      console.log('✅ TEST 8 PASSED: Replacement instructor created successfully, filling slot back to 5/5.');
    } else {
      throw new Error(`TEST 8 FAILED: Expected used 5, remaining 0. Got ${JSON.stringify(stats8)}`);
    }

    // ----------------------------------------------------
    // TEST CASE 9: Learner Deactivation and Permanent Deletion
    // ----------------------------------------------------
    console.log('\n[TEST 9] Testing Learner deactivation and permanent deletion...');
    const learnersList = await prisma.user.findMany({
      where: { organizationId: testOrgId, role: 'Employee' },
      take: 1
    });
    const targetLearner = learnersList[0];

    // Deactivate learner
    const reqDeactLearner = {
      params: { id: targetLearner.id },
      body: { status: 'deactivated' },
      user: orgAdminUser
    };
    const resDeactLearner = mockRes();
    await updateUserStatus(reqDeactLearner, resDeactLearner, (err) => { throw err; });

    const stats9a = await getOrgLicenseStats(testOrgId);
    if (stats9a.usedLicenses !== 5) {
      throw new Error(`TEST 9 FAILED: Learner deactivation decreased license usage! Used: ${stats9a.usedLicenses}`);
    }
    console.log('✅ Learner deactivation does not free license slot.');

    // Permanently delete learner
    const reqDeleteLearner = {
      params: { id: targetLearner.id },
      user: orgAdminUser
    };
    const resDeleteLearner = mockRes();
    await deleteUser(reqDeleteLearner, resDeleteLearner, (err) => { throw err; });

    const stats9b = await getOrgLicenseStats(testOrgId);
    if (stats9b.usedLicenses === 4 && stats9b.remainingLicenses === 1) {
      console.log('✅ TEST 9 PASSED: Permanent learner deletion released license slot (Used: 4, Remaining: 1).');
    } else {
      throw new Error(`TEST 9 FAILED: Expected used 4, remaining 1. Got ${JSON.stringify(stats9b)}`);
    }

    // ----------------------------------------------------
    // TEST CASE 10: Admin deletion must be forbidden
    // ----------------------------------------------------
    console.log('\n[TEST 10] Attempting to delete Organization Admin (must be forbidden)...');
    let adminDeleteBlocked = false;
    const reqDeleteAdmin = {
      params: { id: testOrgAdminId },
      user: orgAdminUser
    };
    const resDeleteAdmin = mockRes();
    await deleteUser(reqDeleteAdmin, resDeleteAdmin, (err) => {
      if (err.statusCode === 400 && err.message.includes('Administrators cannot be deleted')) {
        adminDeleteBlocked = true;
      }
    });

    if (!adminDeleteBlocked) {
      throw new Error('TEST 10 FAILED: Admin deletion was not blocked!');
    }
    console.log('✅ TEST 10 PASSED: Organization Admin cannot be deleted.');

    // ----------------------------------------------------
    // TEST CASE 11: Cleanup Test Organization Data
    // ----------------------------------------------------
    console.log('\n[TEST 11] Cleaning up test organization data from DB...');
    await prisma.organization.delete({ where: { id: testOrgId } });
    console.log('✅ TEST 11 PASSED: Test organization data cleaned up cleanly.');

    console.log('\n----------------------------------------------------');
    console.log('🎉 ALL 11 LICENSE SYSTEM TEST CASES PASSED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    if (testOrgId) {
      try { await prisma.organization.delete({ where: { id: testOrgId } }); } catch (e) {}
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
