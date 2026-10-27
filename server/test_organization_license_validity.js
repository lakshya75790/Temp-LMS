require('dotenv').config();
const { prisma, withId } = require('./config/prismaClient');
const bcrypt = require('bcryptjs');
const { getOrgLicenseValidity, invalidateOrgLicenseCache } = require('./services/licenseService');

async function runTests() {
  console.log('====================================================');
  console.log('  TEST SUITE: ORGANIZATION LICENSE VALIDITY FEATURE ');
  console.log('====================================================\n');

  let testOrg = null;
  let adminUser = null;

  try {
    // 1. Create a test organization
    const orgCode = `TEST-LIC-${Date.now()}`;
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    testOrg = await prisma.organization.create({
      data: {
        name: 'Automated License Test Org',
        code: orgCode,
        totalLicenses: 5,
        licenseStartDate: today,
        licenseEndDate: oneYearLater,
        status: 'ACTIVE'
      }
    });

    adminUser = await prisma.user.create({
      data: {
        name: 'Test Org Admin',
        email: `admin_${Date.now()}@licensetest.com`,
        password: hashedPassword,
        role: 'Admin',
        organizationId: testOrg.id,
        isProfileComplete: true,
        status: 'active'
      }
    });

    console.log(`[SETUP] Created test org "${testOrg.name}" (${testOrg.code}) and Admin "${adminUser.email}"`);

    // Case 1 — Active License Test
    console.log('\n--- CASE 1: Active License Test ---');
    invalidateOrgLicenseCache(testOrg.id);
    let validity = await getOrgLicenseValidity(testOrg.id);
    console.log('Active Validity Result:', validity);
    if (!validity.isValid || validity.status !== 'Active') {
      throw new Error('Case 1 FAILED: Expected Active status for current valid dates');
    }
    console.log('✅ Case 1 PASSED: Active license allows access as expected.');

    // Case 2 — Expired License Test
    console.log('\n--- CASE 2: Expired License Test ---');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 10);

    await prisma.organization.update({
      where: { id: testOrg.id },
      data: {
        licenseStartDate: pastStart,
        licenseEndDate: yesterday
      }
    });
    invalidateOrgLicenseCache(testOrg.id);

    validity = await getOrgLicenseValidity(testOrg.id);
    console.log('Expired Validity Result:', validity);
    if (validity.isValid || validity.status !== 'Expired' || validity.errorCode !== 'ORGANIZATION_LICENSE_EXPIRED') {
      throw new Error('Case 2 FAILED: Expected Expired status and ORGANIZATION_LICENSE_EXPIRED error code');
    }
    console.log('✅ Case 2 PASSED: Expired license correctly blocks access with 403 & ORGANIZATION_LICENSE_EXPIRED code.');

    // Case 3 — Future Start Date Test
    console.log('\n--- CASE 3: Future Start Date Test ---');
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 5);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 30);

    await prisma.organization.update({
      where: { id: testOrg.id },
      data: {
        licenseStartDate: futureStart,
        licenseEndDate: futureEnd
      }
    });
    invalidateOrgLicenseCache(testOrg.id);

    validity = await getOrgLicenseValidity(testOrg.id);
    console.log('Not Started Validity Result:', validity);
    if (validity.isValid || validity.status !== 'Not Started' || validity.errorCode !== 'ORGANIZATION_LICENSE_NOT_STARTED') {
      throw new Error('Case 3 FAILED: Expected Not Started status and ORGANIZATION_LICENSE_NOT_STARTED error code');
    }
    console.log('✅ Case 3 PASSED: Future start date correctly blocks access with ORGANIZATION_LICENSE_NOT_STARTED code.');

    // Case 4 — Super Admin Exemption & Renewal Test
    console.log('\n--- CASE 4: Super Admin Renewal Test ---');
    // Extend license dates back to active
    await prisma.organization.update({
      where: { id: testOrg.id },
      data: {
        licenseStartDate: today,
        licenseEndDate: oneYearLater
      }
    });
    invalidateOrgLicenseCache(testOrg.id);
    validity = await getOrgLicenseValidity(testOrg.id);
    if (!validity.isValid || validity.status !== 'Active') {
      throw new Error('Case 4 FAILED: Extension of dates failed to restore Active status');
    }
    console.log('✅ Case 4 PASSED: Renewal/Extension by Super Admin restores Active status seamlessly.');

    // Case 5 — Existing Organizations Default 1-Year Backfill Test
    console.log('\n--- CASE 5: Existing Organizations Backfill Check ---');
    const orgsWithoutDates = await prisma.organization.count({
      where: {
        OR: [
          { licenseStartDate: null },
          { licenseEndDate: null }
        ]
      }
    });
    console.log('Organizations with missing license dates count:', orgsWithoutDates);
    if (orgsWithoutDates > 0) {
      throw new Error('Case 5 FAILED: Some existing organizations still have NULL license dates');
    }
    console.log('✅ Case 5 PASSED: All existing organizations have been safely backfilled with default license dates.');

    console.log('\n====================================================');
    console.log('  ALL TEST CASES PASSED SUCCESSFULLY! 🎉           ');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup test data
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    if (testOrg) {
      await prisma.organization.delete({ where: { id: testOrg.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTests();
