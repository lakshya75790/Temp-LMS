const { prisma } = require('./config/prismaClient');
const { logSecurityEvent, startQuiz, submitQuiz } = require('./controllers/quizController');

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runQuizFocusAlertTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING QUIZ FOCUS-LOSS ALERT SYSTEM TEST SUITE');
  console.log('====================================================\n');

  const timestamp = Date.now();
  let orgA, orgB;
  let adminA, adminB, learnerA;
  let trainingA, sectionA, subSecA, quizA;

  try {
    // ----------------------------------------------------
    // SETUP: Two Organizations (Org A and Org B)
    // ----------------------------------------------------
    console.log('[SETUP] Creating Org A and Org B with Admins and Learner...');
    orgA = await prisma.organization.create({
      data: {
        name: `Org A Focus Test ${timestamp}`,
        code: `ORGA_${timestamp}`.slice(0, 15),
        totalLicenses: 10
      }
    });

    orgB = await prisma.organization.create({
      data: {
        name: `Org B Isolation Test ${timestamp}`,
        code: `ORGB_${timestamp}`.slice(0, 15),
        totalLicenses: 10
      }
    });

    adminA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'Admin Alpha',
        email: `adminA_${timestamp}@test.com`,
        password: 'Password123!',
        role: 'Admin',
        status: 'active'
      }
    });

    adminB = await prisma.user.create({
      data: {
        organizationId: orgB.id,
        name: 'Admin Beta',
        email: `adminB_${timestamp}@test.com`,
        password: 'Password123!',
        role: 'Admin',
        status: 'active'
      }
    });

    learnerA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'Alice Learner',
        email: `learnerA_${timestamp}@test.com`,
        password: 'Password123!',
        role: 'Employee',
        status: 'active'
      }
    });

    // Create Category & Training
    const catA = await prisma.trainingCategory.create({
      data: {
        organizationId: orgA.id,
        name: `Safety Cat ${timestamp}`
      }
    });

    trainingA = await prisma.training.create({
      data: {
        organizationId: orgA.id,
        categoryId: catA.id,
        title: 'Cybersecurity Fundamentals 101',
        description: 'Core cybersecurity course',
        createdBy: adminA.id
      }
    });

    sectionA = await prisma.trainingSection.create({
      data: {
        trainingId: trainingA.id,
        title: 'Module 1: Password Protocols',
        order: 1
      }
    });

    subSecA = await prisma.trainingSubSection.create({
      data: {
        sectionId: sectionA.id,
        title: 'Password Management Lecture',
        order: 1
      }
    });

    quizA = await prisma.quiz.create({
      data: {
        organizationId: orgA.id,
        trainingId: trainingA.id,
        sectionId: sectionA.id,
        subSectionId: subSecA.id,
        title: 'Password Protocols Assessment',
        passingScorePercent: 70,
        timeLimitMinutes: 10,
        createdBy: adminA.id,
        questions: {
          create: [
            {
              questionText: 'Should you share your password?',
              questionType: 'TRUE_FALSE',
              options: ['True', 'False'],
              correctAnswerIndex: 1,
              correctAnswerText: 'False'
            }
          ]
        }
      }
    });

    console.log('✅ Setup completed: Org A, Org B, Users, Course, and Quiz initialized.\n');

    // ----------------------------------------------------
    // TEST 1: Report event before starting quiz (Must be ignored)
    // ----------------------------------------------------
    console.log('[TEST 1] Reporting focus-loss before quiz attempt has started...');
    const req1 = {
      params: { id: quizA.id },
      body: { eventType: 'Left quiz tab', timestamp: new Date().toISOString() },
      user: learnerA
    };
    const res1 = mockRes();
    await logSecurityEvent(req1, res1, (err) => { throw err; });

    const notifsTest1 = await prisma.notification.findMany({
      where: { organizationId: orgA.id, type: 'QUIZ_FOCUS_ALERT' }
    });

    if (res1.body?.data?.ignored && notifsTest1.length === 0) {
      console.log('✅ TEST 1 PASSED: Focus event correctly ignored when no quiz attempt is in progress.');
    } else {
      throw new Error(`TEST 1 FAILED: Expected event to be ignored. Found ${notifsTest1.length} notifications.`);
    }

    // ----------------------------------------------------
    // TEST 2: Start Quiz Attempt & Report Focus-Loss Event
    // ----------------------------------------------------
    console.log('\n[TEST 2] Starting active quiz attempt and reporting focus-loss ("Left quiz tab")...');
    const reqStart = {
      params: { id: quizA.id },
      body: {},
      user: learnerA
    };
    const resStart = mockRes();
    await startQuiz(reqStart, resStart, (err) => { throw err; });

    const attempt = resStart.body.data.attempt;
    console.log(`   Attempt started (ID: ${attempt.id}, Status: in_progress)`);

    const req2 = {
      params: { id: quizA.id },
      body: {
        attemptId: attempt.id,
        eventType: 'Left quiz tab',
        timestamp: new Date().toISOString()
      },
      user: learnerA
    };
    const res2 = mockRes();
    await logSecurityEvent(req2, res2, (err) => { throw err; });

    // Verify Org A Admin received notification
    const notifsAdminA = await prisma.notification.findMany({
      where: { recipientId: adminA.id, type: 'QUIZ_FOCUS_ALERT' }
    });

    if (notifsAdminA.length !== 1) {
      throw new Error(`TEST 2 FAILED: Expected 1 notification for Admin A, found ${notifsAdminA.length}`);
    }

    const notifMsg = notifsAdminA[0].message;
    console.log(`   Admin Notification Message: "${notifMsg}"`);

    // Verify message components
    const containsLearner = notifMsg.includes(learnerA.name);
    const containsCourse = notifMsg.includes(trainingA.title);
    const containsQuiz = notifMsg.includes(quizA.title);
    const containsEvent = notifMsg.includes('Left quiz tab');
    const containsNeutralPrefix = notifMsg.startsWith('Quiz Focus Alert:');

    if (!containsLearner || !containsCourse || !containsQuiz || !containsEvent || !containsNeutralPrefix) {
      throw new Error(`TEST 2 FAILED: Notification message missing required fields! Message: "${notifMsg}"`);
    }

    console.log('✅ TEST 2 PASSED: Organization Admin received neutral focus alert with all required details.');

    // ----------------------------------------------------
    // TEST 3: Tenant Isolation (Org B Admin must receive 0 alerts)
    // ----------------------------------------------------
    console.log('\n[TEST 3] Verifying organization tenant isolation (Org B Admin)...');
    const notifsAdminB = await prisma.notification.findMany({
      where: { recipientId: adminB.id }
    });

    if (notifsAdminB.length === 0) {
      console.log('✅ TEST 3 PASSED: Cross-tenant isolation verified. Org B received 0 notifications.');
    } else {
      throw new Error(`TEST 3 FAILED: Org B Admin received ${notifsAdminB.length} unintended notifications!`);
    }

    // ----------------------------------------------------
    // TEST 4: Prevent Duplicate Alerts (Simultaneous Browser Events)
    // ----------------------------------------------------
    console.log('\n[TEST 4] Simulating simultaneous browser events (blur, fullscreen_exit within cooldown)...');
    
    // Simulate immediate burst event 1: Window lost focus
    const reqBurst1 = {
      params: { id: quizA.id },
      body: { attemptId: attempt.id, eventType: 'Window lost focus' },
      user: learnerA
    };
    const resBurst1 = mockRes();
    await logSecurityEvent(reqBurst1, resBurst1, (err) => { throw err; });

    // Simulate immediate burst event 2: Exited fullscreen
    const reqBurst2 = {
      params: { id: quizA.id },
      body: { attemptId: attempt.id, eventType: 'Exited fullscreen' },
      user: learnerA
    };
    const resBurst2 = mockRes();
    await logSecurityEvent(reqBurst2, resBurst2, (err) => { throw err; });

    const totalNotifsA = await prisma.notification.count({
      where: { recipientId: adminA.id, type: 'QUIZ_FOCUS_ALERT' }
    });

    if (totalNotifsA === 1 && resBurst1.body?.data?.deduplicated && resBurst2.body?.data?.deduplicated) {
      console.log('✅ TEST 4 PASSED: Simultaneous burst events deduplicated; no spam notifications created.');
    } else {
      throw new Error(`TEST 4 FAILED: Expected total 1 notification after burst, found ${totalNotifsA}`);
    }

    // ----------------------------------------------------
    // TEST 5: Distinct Focus Event After Cooldown
    // ----------------------------------------------------
    console.log('\n[TEST 5] Testing genuine separate focus event after cooldown expires...');
    // Artificially age the existing notification to simulate cooldown expiry
    await prisma.notification.updateMany({
      where: { recipientId: adminA.id, type: 'QUIZ_FOCUS_ALERT' },
      data: { createdAt: new Date(Date.now() - 10000) }
    });

    const reqSeparate = {
      params: { id: quizA.id },
      body: { attemptId: attempt.id, eventType: 'Exited fullscreen', timestamp: new Date().toISOString() },
      user: learnerA
    };
    const resSeparate = mockRes();
    await logSecurityEvent(reqSeparate, resSeparate, (err) => { throw err; });

    const notifsAfterCooldown = await prisma.notification.count({
      where: { recipientId: adminA.id, type: 'QUIZ_FOCUS_ALERT' }
    });

    if (notifsAfterCooldown === 2 && resSeparate.body?.data?.reported) {
      console.log('✅ TEST 5 PASSED: Distinct focus event after cooldown was recorded successfully (Total: 2).');
    } else {
      throw new Error(`TEST 5 FAILED: Expected total 2 notifications, found ${notifsAfterCooldown}`);
    }

    // ----------------------------------------------------
    // TEST 6: Normal Quiz Submission & Post-Submission Event Rejection
    // ----------------------------------------------------
    console.log('\n[TEST 6] Submitting quiz and verifying normal submission and post-submit protection...');
    const reqSubmit = {
      params: { id: quizA.id },
      body: {
        attemptId: attempt.id,
        userAnswers: [
          { questionIndex: 0, selectedOptionIndex: 1 } // Correct answer (False = index 1)
        ]
      },
      user: learnerA
    };
    const resSubmit = mockRes();
    await submitQuiz(reqSubmit, resSubmit, (err) => { throw err; });

    const submitResult = resSubmit.body?.data;
    console.log(`   Quiz Result: Score=${submitResult.totalScore}/${submitResult.maxScore}, Passed=${submitResult.passed}`);

    if (!submitResult.passed) {
      throw new Error('TEST 6 FAILED: Quiz was expected to pass!');
    }

    // Now attempt reporting a focus event after submission (e.g. normal page navigation)
    const reqPostSubmit = {
      params: { id: quizA.id },
      body: { attemptId: attempt.id, eventType: 'Left quiz tab' },
      user: learnerA
    };
    const resPostSubmit = mockRes();
    await logSecurityEvent(reqPostSubmit, resPostSubmit, (err) => { throw err; });

    const notifsAfterSubmit = await prisma.notification.count({
      where: { recipientId: adminA.id, type: 'QUIZ_FOCUS_ALERT' }
    });

    if (resPostSubmit.body?.data?.ignored && notifsAfterSubmit === 2) {
      console.log('✅ TEST 6 PASSED: Post-submission event cleanly ignored. No false alerts on normal navigation.');
    } else {
      throw new Error(`TEST 6 FAILED: False alert created after quiz completion! Total: ${notifsAfterSubmit}`);
    }

    // ----------------------------------------------------
    // TEST 7: Existing Quiz Functionality Preserved
    // ----------------------------------------------------
    console.log('\n[TEST 7] Verifying existing quiz attempt history and progress tracking...');
    const completedAttempt = await prisma.quizAttempt.findUnique({
      where: { id: attempt.id },
      include: { answers: true }
    });

    if (completedAttempt.status === 'completed' && completedAttempt.passed === true && completedAttempt.answers.length > 0) {
      console.log('✅ TEST 7 PASSED: Attempt status, score, answers, and passed state intact.');
    } else {
      throw new Error(`TEST 7 FAILED: Completed attempt data invalid: ${JSON.stringify(completedAttempt)}`);
    }

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test data from database...');
    await prisma.organization.delete({ where: { id: orgA.id } });
    await prisma.organization.delete({ where: { id: orgB.id } });
    console.log('✅ Cleaned up Org A and Org B cleanly.');

    console.log('\n====================================================');
    console.log('🎉 ALL 7 QUIZ FOCUS ALERT TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    if (orgA?.id) await prisma.organization.delete({ where: { id: orgA.id } }).catch(() => {});
    if (orgB?.id) await prisma.organization.delete({ where: { id: orgB.id } }).catch(() => {});
    process.exit(1);
  }
}

runQuizFocusAlertTests().then(() => process.exit(0));
