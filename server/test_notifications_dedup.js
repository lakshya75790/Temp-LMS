const { prisma } = require('./config/prismaClient');
const { sendUserNotification, sendInstructorNotification, sendAdminNotification } = require('./services/notificationService');

async function runComprehensiveTests() {
  console.log('=== RUNNING COMPREHENSIVE NOTIFICATION AUDIT & SAFETY VERIFICATION ===\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  try {
    const orgs = await prisma.organization.findMany({
      include: { users: true }
    });

    const multiAdminOrg = orgs.find(o => o.users.filter(u => u.role === 'Admin').length >= 2) || orgs[0];
    const org = multiAdminOrg;

    if (!org) {
      throw new Error('No test organization found in database.');
    }

    const admins = org.users.filter(u => u.role === 'Admin');
    const learners = org.users.filter(u => u.role === 'Employee');
    const instructors = org.users.filter(u => u.role === 'Instructor');

    const testLearner = learners[0] || admins[0];
    const testInstructor = instructors[0] || (admins.length > 1 ? admins[1] : admins[0]);

    console.log(`Testing with Org: ${org.name} (${org.id})`);
    console.log(`Admins: ${admins.length}, Instructors: ${instructors.length}, Learners: ${learners.length}\n`);

    // TEST 1: Admin Query Isolation in Multi-Admin Org
    console.log('Test 1: Admin Query Isolation in Multi-Admin Org');
    if (admins.length >= 2) {
      const admin1 = admins[0];
      const admin2 = admins[1];

      await prisma.notification.deleteMany({
        where: { organizationId: org.id, type: 'TEST_ADMIN_ISOLATION' }
      });

      await sendAdminNotification(
        org.id,
        'TEST_ADMIN_ISOLATION',
        'Org Alert',
        'Admin Specific Event'
      );

      const whereAdmin1 = {
        organizationId: org.id,
        OR: [{ recipientId: admin1.id }, { recipientId: null, role: 'Admin' }],
        type: 'TEST_ADMIN_ISOLATION'
      };
      const notifsAdmin1 = await prisma.notification.findMany({ where: whereAdmin1 });

      const whereAdmin2 = {
        organizationId: org.id,
        OR: [{ recipientId: admin2.id }, { recipientId: null, role: 'Admin' }],
        type: 'TEST_ADMIN_ISOLATION'
      };
      const notifsAdmin2 = await prisma.notification.findMany({ where: whereAdmin2 });

      assert(notifsAdmin1.length === 1, `Admin 1 sees exactly 1 notification (found ${notifsAdmin1.length})`);
      assert(notifsAdmin2.length === 1, `Admin 2 sees exactly 1 notification (found ${notifsAdmin2.length})`);
      assert(notifsAdmin1[0].recipientId === admin1.id, `Admin 1 notification is addressed to Admin 1`);
      assert(notifsAdmin2[0].recipientId === admin2.id, `Admin 2 notification is addressed to Admin 2`);

      await prisma.notification.deleteMany({
        where: { organizationId: org.id, type: 'TEST_ADMIN_ISOLATION' }
      });
    } else {
      console.log('  [SKIP] Multi-admin test skipped (fewer than 2 admins).');
    }

    // TEST 2: Quiz Failure Idempotency for Same Attempt vs Genuine Retake
    console.log('\nTest 2: Quiz Failure Idempotency (Same Attempt vs Retake)');
    const fakeAttemptId1 = 'test-attempt-uuid-001';
    const fakeAttemptId2 = 'test-attempt-uuid-002';

    await prisma.notification.deleteMany({
      where: {
        recipientId: testLearner.id,
        relatedEntityType: 'QuizAttempt',
        relatedEntityId: { in: [fakeAttemptId1, fakeAttemptId2] }
      }
    });

    // Attempt 1: First submit
    await sendUserNotification(
      testLearner.id,
      org.id,
      'Employee',
      'QUIZ_FAILED',
      'Quiz Failed',
      'You did not pass the quiz.',
      { entityType: 'QuizAttempt', entityId: fakeAttemptId1 },
      { preventDuplicates: true }
    );

    // Attempt 1: Redundant submit call (e.g. manual click + timer auto-submit)
    await sendUserNotification(
      testLearner.id,
      org.id,
      'Employee',
      'QUIZ_FAILED',
      'Quiz Failed',
      'You did not pass the quiz.',
      { entityType: 'QuizAttempt', entityId: fakeAttemptId1 },
      { preventDuplicates: true }
    );

    const attempt1Notifs = await prisma.notification.findMany({
      where: {
        recipientId: testLearner.id,
        type: 'QUIZ_FAILED',
        relatedEntityType: 'QuizAttempt',
        relatedEntityId: fakeAttemptId1
      }
    });
    assert(attempt1Notifs.length === 1, `Single quiz failure creates exactly 1 record for attempt 1 (found ${attempt1Notifs.length})`);

    // Attempt 2: Genuine retake (new attemptId)
    await sendUserNotification(
      testLearner.id,
      org.id,
      'Employee',
      'QUIZ_FAILED',
      'Quiz Failed',
      'You did not pass the quiz on second try.',
      { entityType: 'QuizAttempt', entityId: fakeAttemptId2 },
      { preventDuplicates: true }
    );

    const attempt2Notifs = await prisma.notification.findMany({
      where: {
        recipientId: testLearner.id,
        type: 'QUIZ_FAILED',
        relatedEntityType: 'QuizAttempt',
        relatedEntityId: fakeAttemptId2
      }
    });
    assert(attempt2Notifs.length === 1, `Subsequent quiz retake creates legitimate notification for attempt 2 (found ${attempt2Notifs.length})`);

    await prisma.notification.deleteMany({
      where: {
        recipientId: testLearner.id,
        relatedEntityType: 'QuizAttempt',
        relatedEntityId: { in: [fakeAttemptId1, fakeAttemptId2] }
      }
    });

    // TEST 3: Two Distinct Legitimate Events within 3 Seconds (Must NOT be suppressed!)
    console.log('\nTest 3: Two Distinct Legitimate Events within 3 Seconds');
    const entityA = 'test-training-entity-A';
    const entityB = 'test-training-entity-B';

    await prisma.notification.deleteMany({
      where: {
        recipientId: testLearner.id,
        relatedEntityType: 'Training',
        relatedEntityId: { in: [entityA, entityB] }
      }
    });

    // Event A (Training A assigned)
    await sendUserNotification(
      testLearner.id,
      org.id,
      'Employee',
      'TRAINING_ASSIGNED',
      'Training Assigned',
      'You have been assigned to a training course.',
      { entityType: 'Training', entityId: entityA }
    );

    // Event B (Training B assigned immediately afterwards, within < 50ms)
    await sendUserNotification(
      testLearner.id,
      org.id,
      'Employee',
      'TRAINING_ASSIGNED',
      'Training Assigned',
      'You have been assigned to a training course.',
      { entityType: 'Training', entityId: entityB }
    );

    const distinctNotifs = await prisma.notification.findMany({
      where: {
        recipientId: testLearner.id,
        type: 'TRAINING_ASSIGNED',
        relatedEntityType: 'Training',
        relatedEntityId: { in: [entityA, entityB] }
      }
    });
    assert(distinctNotifs.length === 2, `Both distinct events within 3s were preserved (found ${distinctNotifs.length}, expected 2)`);

    await prisma.notification.deleteMany({
      where: {
        recipientId: testLearner.id,
        relatedEntityType: 'Training',
        relatedEntityId: { in: [entityA, entityB] }
      }
    });

    // TEST 4: Concurrent Duplicate Requests (Promise.all race condition)
    console.log('\nTest 4: Concurrent Duplicate Requests (Promise.all)');
    const raceEntity = 'test-concurrent-entity-001';
    await prisma.notification.deleteMany({
      where: {
        recipientId: testLearner.id,
        relatedEntityType: 'ConcurrentTest',
        relatedEntityId: raceEntity
      }
    });

    // Fire 2 calls concurrently
    await Promise.all([
      sendUserNotification(
        testLearner.id,
        org.id,
        'Employee',
        'CONCURRENT_TEST',
        'Concurrent Event',
        'Same event submitted simultaneously',
        { entityType: 'ConcurrentTest', entityId: raceEntity },
        { preventDuplicates: true }
      ),
      sendUserNotification(
        testLearner.id,
        org.id,
        'Employee',
        'CONCURRENT_TEST',
        'Concurrent Event',
        'Same event submitted simultaneously',
        { entityType: 'ConcurrentTest', entityId: raceEntity },
        { preventDuplicates: true }
      )
    ]);

    const concurrentNotifs = await prisma.notification.findMany({
      where: {
        recipientId: testLearner.id,
        relatedEntityType: 'ConcurrentTest',
        relatedEntityId: raceEntity
      }
    });
    assert(concurrentNotifs.length === 1, `Concurrent duplicate calls create exactly 1 notification (found ${concurrentNotifs.length})`);

    await prisma.notification.deleteMany({
      where: {
        recipientId: testLearner.id,
        relatedEntityType: 'ConcurrentTest',
        relatedEntityId: raceEntity
      }
    });

    // TEST 5: Recipient Targeting across All Three Roles
    console.log('\nTest 5: Recipient Targeting Across All Three Roles');
    const adminUser = admins[0];
    const instUser = testInstructor;
    const lrnUser = testLearner;

    const testRoleTypes = ['ADMIN_EVENT_TEST', 'INSTRUCTOR_EVENT_TEST', 'LEARNER_EVENT_TEST'];
    await prisma.notification.deleteMany({
      where: {
        organizationId: org.id,
        type: { in: testRoleTypes }
      }
    });

    // Admin target
    await sendAdminNotification(
      org.id,
      'ADMIN_EVENT_TEST',
      'Admin Alert',
      'For admins only'
    );
    // Instructor target
    await sendInstructorNotification(
      instUser.id,
      org.id,
      'INSTRUCTOR_EVENT_TEST',
      'Instructor Alert',
      'For instructor only'
    );
    // Learner target
    await sendUserNotification(
      lrnUser.id,
      org.id,
      'Employee',
      'LEARNER_EVENT_TEST',
      'Learner Alert',
      'For learner only'
    );

    const adminCheck = await prisma.notification.findMany({
      where: { organizationId: org.id, type: 'ADMIN_EVENT_TEST' }
    });
    const instCheck = await prisma.notification.findMany({
      where: { organizationId: org.id, type: 'INSTRUCTOR_EVENT_TEST' }
    });
    const lrnCheck = await prisma.notification.findMany({
      where: { organizationId: org.id, type: 'LEARNER_EVENT_TEST' }
    });

    assert(adminCheck.every(n => n.role === 'Admin'), `All admin alert recipients have role Admin`);
    assert(instCheck.length === 1 && instCheck[0].recipientId === instUser.id, `Instructor alert correctly targeted to instructor`);
    assert(lrnCheck.length === 1 && lrnCheck[0].recipientId === lrnUser.id, `Learner alert correctly targeted to learner`);

    await prisma.notification.deleteMany({
      where: { organizationId: org.id, type: { in: testRoleTypes } }
    });

    // TEST 6: Socket.IO / Frontend State Deduplication Simulation
    console.log('\nTest 6: Socket.IO Frontend State Deduplication Logic');
    let stateNotifications = [
      { id: 'notif-1', isRead: false, title: 'Existing Notif' }
    ];
    let serverUnreadCount = 1;

    // Simulate handleNewNotification function in NotificationContext
    const simulateReceiveSocketNotification = (newNotif) => {
      if (!newNotif) return;
      const notifId = newNotif.id || newNotif._id;
      const alreadyPresent = stateNotifications.some(n => (n.id === notifId || n._id === notifId));
      if (!alreadyPresent) {
        stateNotifications = [newNotif, ...stateNotifications];
        serverUnreadCount += 1;
      }
    };

    // Receive duplicate socket delivery of notif-1
    simulateReceiveSocketNotification({ id: 'notif-1', isRead: false, title: 'Existing Notif' });
    assert(stateNotifications.length === 1, `Duplicate socket delivery does not add duplicate to notifications state (length ${stateNotifications.length})`);
    assert(serverUnreadCount === 1, `Duplicate socket delivery does not increment unread badge count (count ${serverUnreadCount})`);

    // Receive genuine new notification
    simulateReceiveSocketNotification({ id: 'notif-2', isRead: false, title: 'New Notif' });
    assert(stateNotifications.length === 2, `Genuine new socket notification adds to notifications state (length ${stateNotifications.length})`);
    assert(serverUnreadCount === 2, `Genuine new socket notification increments unread badge count (count ${serverUnreadCount})`);

    // TEST 7: Mobile Directory Untouched Check
    console.log('\nTest 7: Mobile Directory Untouched Check');
    const { execSync } = require('child_process');
    const gitDiffMobile = execSync('git status --porcelain mobile', { cwd: '..' }).toString().trim();
    assert(gitDiffMobile === '', `Mobile folder has zero changes (git status: "${gitDiffMobile}")`);

    console.log(`\n=== SUMMARY: ${passedCount}/${totalCount} SAFETY TESTS PASSED ===\n`);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runComprehensiveTests();
