const { prisma } = require('./config/prismaClient');

async function auditHistorical() {
  const notifs = await prisma.notification.findMany({
    orderBy: { createdAt: 'asc' }
  });

  // Group 1: By recipient, org, type, title, message (ignoring entity)
  const coarseGroups = {};
  // Group 2: Full event context: recipient, org, type, relatedEntityType, relatedEntityId, title, message
  const preciseGroups = {};

  for (const n of notifs) {
    const coarseKey = [n.organizationId, n.recipientId || 'null', n.type, n.title, n.message].join('|');
    const entityKey = `${n.relatedEntityType || 'none'}:${n.relatedEntityId || 'none'}`;
    const preciseKey = [n.organizationId, n.recipientId || 'null', n.type, entityKey, n.title, n.message].join('|');

    if (!coarseGroups[coarseKey]) coarseGroups[coarseKey] = [];
    coarseGroups[coarseKey].push(n);

    if (!preciseGroups[preciseKey]) preciseGroups[preciseKey] = [];
    preciseGroups[preciseKey].push(n);
  }

  let coarseDupGroups = 0;
  let coarseExcessRows = 0;
  for (const list of Object.values(coarseGroups)) {
    if (list.length > 1) {
      coarseDupGroups++;
      coarseExcessRows += (list.length - 1);
    }
  }

  let preciseDupGroups = 0;
  let preciseExcessRows = 0;
  const sampleDuplicates = [];
  for (const [key, list] of Object.entries(preciseGroups)) {
    if (list.length > 1) {
      preciseDupGroups++;
      preciseExcessRows += (list.length - 1);
      if (sampleDuplicates.length < 5) {
        sampleDuplicates.push({
          type: list[0].type,
          title: list[0].title,
          recipientId: list[0].recipientId,
          role: list[0].role,
          count: list.length,
          timeDifferencesMs: list.slice(1).map((n, i) => new Date(n.createdAt) - new Date(list[i].createdAt))
        });
      }
    }
  }

  console.log(`Audit Results:`);
  console.log(`- Total notifications analyzed: ${notifs.length}`);
  console.log(`- Coarse matching (recipient + type + title + message): ${coarseDupGroups} groups, ${coarseExcessRows} excess rows`);
  console.log(`- Strict matching (including relatedEntityType & relatedEntityId): ${preciseDupGroups} groups, ${preciseExcessRows} excess rows`);
  console.log(`\nSample Strict Duplicate Groups:`);
  console.log(JSON.stringify(sampleDuplicates, null, 2));

  await prisma.$disconnect();
}

auditHistorical().catch(console.error);
