import { PrismaClient, Role, MosqueStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

function isLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function prayerDays(year: number, base: { fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string }[]) {
  const counts = [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const days: any[] = [];
  for (let m = 1; m <= 12; m++) {
    const t = base[m - 1];
    for (let d = 1; d <= counts[m - 1]; d++) {
      days.push({ month: m, day: d, ...t });
    }
  }
  return days;
}

const COLOMBO_TIMES = [
  { fajr: "05:30", shuruq: "06:50", dhuhr: "12:15", asr: "15:30", maghrib: "18:00", isha: "19:15" },
  { fajr: "05:20", shuruq: "06:40", dhuhr: "12:15", asr: "15:35", maghrib: "18:10", isha: "19:25" },
  { fajr: "05:05", shuruq: "06:25", dhuhr: "12:10", asr: "15:35", maghrib: "18:20", isha: "19:35" },
  { fajr: "04:50", shuruq: "06:08", dhuhr: "12:05", asr: "15:30", maghrib: "18:25", isha: "19:40" },
  { fajr: "04:40", shuruq: "05:55", dhuhr: "12:00", asr: "15:25", maghrib: "18:30", isha: "19:45" },
  { fajr: "04:38", shuruq: "05:50", dhuhr: "12:00", asr: "15:25", maghrib: "18:32", isha: "19:47" },
  { fajr: "04:42", shuruq: "05:55", dhuhr: "12:02", asr: "15:28", maghrib: "18:30", isha: "19:45" },
  { fajr: "04:50", shuruq: "06:05", dhuhr: "12:05", asr: "15:32", maghrib: "18:25", isha: "19:40" },
  { fajr: "05:00", shuruq: "06:15", dhuhr: "12:05", asr: "15:32", maghrib: "18:15", isha: "19:30" },
  { fajr: "05:10", shuruq: "06:28", dhuhr: "12:10", asr: "15:30", maghrib: "18:05", isha: "19:20" },
  { fajr: "05:22", shuruq: "06:40", dhuhr: "12:12", asr: "15:25", maghrib: "17:58", isha: "19:12" },
  { fajr: "05:30", shuruq: "06:50", dhuhr: "12:15", asr: "15:25", maghrib: "17:55", isha: "19:10" },
];

const PARIS_TIMES = [
  { fajr: "06:30", shuruq: "08:20", dhuhr: "12:50", asr: "15:00", maghrib: "17:20", isha: "18:50" },
  { fajr: "06:00", shuruq: "07:40", dhuhr: "12:50", asr: "15:30", maghrib: "18:10", isha: "19:50" },
  { fajr: "05:20", shuruq: "06:55", dhuhr: "12:45", asr: "16:00", maghrib: "19:00", isha: "20:40" },
  { fajr: "04:30", shuruq: "06:05", dhuhr: "12:40", asr: "16:30", maghrib: "19:50", isha: "21:30" },
  { fajr: "03:40", shuruq: "05:25", dhuhr: "12:40", asr: "17:00", maghrib: "20:40", isha: "22:30" },
  { fajr: "03:10", shuruq: "05:00", dhuhr: "12:45", asr: "17:15", maghrib: "21:10", isha: "23:00" },
  { fajr: "03:25", shuruq: "05:10", dhuhr: "12:50", asr: "17:10", maghrib: "21:05", isha: "22:55" },
  { fajr: "04:10", shuruq: "05:55", dhuhr: "12:50", asr: "16:45", maghrib: "20:30", isha: "22:10" },
  { fajr: "05:00", shuruq: "06:40", dhuhr: "12:40", asr: "16:10", maghrib: "19:30", isha: "21:10" },
  { fajr: "05:50", shuruq: "07:25", dhuhr: "12:35", asr: "15:30", maghrib: "18:20", isha: "19:50" },
  { fajr: "06:30", shuruq: "08:05", dhuhr: "12:30", asr: "14:50", maghrib: "17:10", isha: "18:40" },
  { fajr: "06:50", shuruq: "08:35", dhuhr: "12:40", asr: "14:40", maghrib: "16:50", isha: "18:20" },
];

async function main() {
  console.log("Seeding database…");
  const year = new Date().getFullYear();

  // ── Users ─────────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@mawaqit.local" },
    update: {},
    create: {
      email: "admin@mawaqit.local",
      passwordHash: await hash("Admin@123456"),
      firstName: "Platform",
      lastName: "Admin",
      role: Role.SUPER_ADMIN,
      emailVerified: true,
      status: "active",
    },
  });
  console.log(`✓ SUPER_ADMIN: ${admin.email}`);

  const mosqueAdmin = await prisma.user.upsert({
    where: { email: "imam@alazhar.lk" },
    update: {},
    create: {
      email: "imam@alazhar.lk",
      passwordHash: await hash("Imam@123456"),
      firstName: "Mohamed",
      lastName: "Rasheed",
      role: Role.MOSQUE_ADMIN,
      emailVerified: true,
      status: "active",
    },
  });
  console.log(`✓ MOSQUE_ADMIN: ${mosqueAdmin.email}`);

  const staffUser = await prisma.user.upsert({
    where: { email: "staff@paris-mosque.fr" },
    update: {},
    create: {
      email: "staff@paris-mosque.fr",
      passwordHash: await hash("Staff@123456"),
      firstName: "Karim",
      lastName: "Benali",
      role: Role.STAFF,
      emailVerified: true,
      status: "active",
    },
  });
  console.log(`✓ STAFF: ${staffUser.email}`);

  // ── Mosque 1: Al Azhar, Sri Lanka ─────────────────────────────────────────────
  const mosque1 = await prisma.mosque.upsert({
    where: { slug: "al-azhar-galgamuwa" },
    update: { status: MosqueStatus.ONLINE, phone: "+94370000001", email: "alazhar@example.com" },
    create: {
      slug: "al-azhar-galgamuwa",
      name: "Al Azhar Jumma Masjid",
      address: "Main Street, Galgamuwa",
      city: "Galgamuwa",
      zipcode: "60470",
      countryCode: "LK",
      latitude: 8.0003,
      longitude: 80.3167,
      timezone: "Asia/Colombo",
      phone: "+94370000001",
      email: "alazhar@example.com",
      website: "https://alazhar.example.com",
      associationName: "Islamic Society of Galgamuwa",
      showOnMap: true,
      status: MosqueStatus.ONLINE,
      facilities: { parking: true, womenSection: true, wheelchairAccess: false, wuduFacilities: true, quranClasses: true },
      capacityMen: 500,
      capacityWomen: 200,
    },
  });
  console.log(`✓ Mosque 1: ${mosque1.name}`);

  await prisma.mosqueConfig.upsert({
    where: { mosqueId: mosque1.id },
    update: {},
    create: {
      mosqueId: mosque1.id,
      regional: { timezone: "Asia/Colombo", calculationMethod: "University of Islamic Sciences, Karachi", juristicMethod: "Hanafi" },
      iqama: { enabled: true, displayCountdown: true, fajr: 20, dhuhr: 15, asr: 15, maghrib: 5, isha: 15 },
      jumua: { time1: "12:30", jumua2Enabled: false },
      display: { showFajrEnd: true, showHijri: true, showTemp: false },
      content: { randomHadith: true, hadithInterval: 600 },
      eid: { enabled: false },
    },
  });

  await prisma.subscription.upsert({
    where: { mosqueId: mosque1.id },
    update: {},
    create: { mosqueId: mosque1.id, plan: "free", status: "active" },
  });

  await prisma.mosqueUser.upsert({
    where: { userId_mosqueId: { userId: admin.id, mosqueId: mosque1.id } },
    update: {},
    create: { userId: admin.id, mosqueId: mosque1.id, role: Role.SUPER_ADMIN },
  });
  await prisma.mosqueUser.upsert({
    where: { userId_mosqueId: { userId: mosqueAdmin.id, mosqueId: mosque1.id } },
    update: {},
    create: { userId: mosqueAdmin.id, mosqueId: mosque1.id, role: Role.MOSQUE_ADMIN },
  });

  // Prayer schedule mosque 1
  const existing1 = await prisma.prayerSchedule.findUnique({ where: { mosqueId_year: { mosqueId: mosque1.id, year } } });
  if (!existing1) {
    await prisma.prayerSchedule.create({
      data: { mosqueId: mosque1.id, source: "CALENDAR", year, days: { create: prayerDays(year, COLOMBO_TIMES) } },
    });
    console.log(`✓ Prayer schedule ${year} created for mosque 1`);
  } else {
    console.log(`✓ Prayer schedule ${year} already exists for mosque 1`);
  }

  // Announcements mosque 1
  for (const ann of [
    { title: "Jumu'ah Khutba Time", content: "Jumu'ah Khutba begins every Friday at 12:30 PM. All brothers are welcome to attend.", type: "TEXT" as const, enabled: true, onMainScreen: true, onMobile: true, sortOrder: 1 },
    { title: "Ramadan Iftar Schedule", content: "Join us for daily Iftar. Dates, water, and meals provided. Please bring a contribution if possible.", type: "TEXT" as const, enabled: true, onMainScreen: true, onMobile: true, sortOrder: 2 },
    { title: "Quranic Classes for Children", content: "Quranic education every Saturday 9 AM–12 PM. Ages 5–15. Registration open.", type: "TEXT" as const, enabled: true, onMainScreen: true, onMobile: false, sortOrder: 3 },
    { title: "Mosque Renovation Fund", content: "We are raising funds to renovate the main prayer hall. Donate generously.", type: "TEXT" as const, enabled: false, onMainScreen: false, onMobile: true, sortOrder: 4 },
  ]) {
    const existing = await prisma.announcement.findFirst({ where: { mosqueId: mosque1.id, title: ann.title } });
    if (!existing) await prisma.announcement.create({ data: { mosqueId: mosque1.id, ...ann } });
  }
  console.log(`✓ Announcements for mosque 1`);

  // Flash messages mosque 1
  const fm1existing = await prisma.flashMessage.findFirst({ where: { mosqueId: mosque1.id } });
  if (!fm1existing) {
    await prisma.flashMessage.createMany({
      data: [
        { mosqueId: mosque1.id, content: "Please silence your mobile phones during prayer.", enabled: true },
        { mosqueId: mosque1.id, content: "Children must be accompanied by an adult at all times.", enabled: true },
        { mosqueId: mosque1.id, content: "Parking available behind the masjid on Fridays.", enabled: false },
      ],
    });
  }
  console.log(`✓ Flash messages for mosque 1`);

  // Events mosque 1
  const ev1existing = await prisma.event.findFirst({ where: { mosqueId: mosque1.id } });
  if (!ev1existing) {
    await prisma.event.createMany({
      data: [
        { mosqueId: mosque1.id, title: "Islamic New Year Lecture", description: "Join Sheikh Abdullah for a special lecture on the Islamic New Year.", category: "lecture", startsAt: new Date(`${year}-07-15T18:00:00Z`), endsAt: new Date(`${year}-07-15T20:00:00Z`), location: "Main Prayer Hall" },
        { mosqueId: mosque1.id, title: "Eid Al-Adha Prayers", description: "Eid prayer at 7:00 AM followed by community breakfast.", category: "prayer", startsAt: new Date(`${year}-06-16T01:00:00Z`), endsAt: new Date(`${year}-06-16T03:00:00Z`), location: "Main Prayer Hall" },
        { mosqueId: mosque1.id, title: "Community Fundraiser Dinner", description: "Annual fundraiser dinner to support mosque operations.", category: "fundraiser", startsAt: new Date(`${year}-08-20T17:00:00Z`), endsAt: new Date(`${year}-08-20T21:00:00Z`), location: "Community Hall" },
      ],
    });
  }
  console.log(`✓ Events for mosque 1`);

  // ── Mosque 2: Grande Mosquée de Paris ─────────────────────────────────────────
  const mosque2 = await prisma.mosque.upsert({
    where: { slug: "grande-mosquee-paris" },
    update: { status: MosqueStatus.ONLINE },
    create: {
      slug: "grande-mosquee-paris",
      name: "Grande Mosquée de Paris",
      address: "2 Place du Puits de l'Ermite",
      city: "Paris",
      zipcode: "75005",
      countryCode: "FR",
      latitude: 48.8416,
      longitude: 2.3548,
      timezone: "Europe/Paris",
      phone: "+33143312015",
      email: "contact@mosqueedeparis.net",
      website: "https://mosqueedeparis.net",
      associationName: "Association Culturelle de la Grande Mosquée de Paris",
      showOnMap: true,
      status: MosqueStatus.ONLINE,
      facilities: { parking: false, womenSection: true, wheelchairAccess: true, wuduFacilities: true, quranClasses: true, library: true, restaurant: true },
      capacityMen: 3000,
      capacityWomen: 1500,
      constructionYear: 1926,
    },
  });
  console.log(`✓ Mosque 2: ${mosque2.name}`);

  await prisma.mosqueConfig.upsert({
    where: { mosqueId: mosque2.id },
    update: {},
    create: {
      mosqueId: mosque2.id,
      regional: { timezone: "Europe/Paris", calculationMethod: "Union des Organisations Islamiques de France", juristicMethod: "Shafi" },
      iqama: { enabled: true, displayCountdown: true, fajr: 25, dhuhr: 20, asr: 20, maghrib: 5, isha: 20 },
      jumua: { time1: "13:00", time2: "14:30", jumua2Enabled: true },
      display: { showFajrEnd: false, showHijri: true, showTemp: true },
      content: { randomHadith: true, hadithInterval: 300 },
      eid: { enabled: true, eidTime: "08:00" },
    },
  });

  await prisma.subscription.upsert({
    where: { mosqueId: mosque2.id },
    update: {},
    create: { mosqueId: mosque2.id, plan: "premium", status: "active" },
  });

  await prisma.mosqueUser.upsert({
    where: { userId_mosqueId: { userId: admin.id, mosqueId: mosque2.id } },
    update: {},
    create: { userId: admin.id, mosqueId: mosque2.id, role: Role.SUPER_ADMIN },
  });
  await prisma.mosqueUser.upsert({
    where: { userId_mosqueId: { userId: staffUser.id, mosqueId: mosque2.id } },
    update: {},
    create: { userId: staffUser.id, mosqueId: mosque2.id, role: Role.STAFF },
  });

  const existing2 = await prisma.prayerSchedule.findUnique({ where: { mosqueId_year: { mosqueId: mosque2.id, year } } });
  if (!existing2) {
    await prisma.prayerSchedule.create({
      data: { mosqueId: mosque2.id, source: "CALENDAR", year, days: { create: prayerDays(year, PARIS_TIMES) } },
    });
    console.log(`✓ Prayer schedule ${year} for mosque 2`);
  }

  for (const ann of [
    { title: "Salat Al-Jumu'ah", content: "Khutba en arabe et en français. Deux sessions : 13h00 et 14h30.", type: "TEXT" as const, enabled: true, onMainScreen: true, onMobile: true, sortOrder: 1 },
    { title: "Cours d'arabe pour adultes", content: "Inscriptions ouvertes pour les cours d'arabe du niveau débutant au avancé.", type: "TEXT" as const, enabled: true, onMainScreen: true, onMobile: true, sortOrder: 2 },
    { title: "Fermeture pour travaux", content: "La bibliothèque sera fermée du 1 au 15 juillet pour travaux de rénovation.", type: "TEXT" as const, enabled: true, onMainScreen: false, onMobile: true, sortOrder: 3 },
  ]) {
    const existing = await prisma.announcement.findFirst({ where: { mosqueId: mosque2.id, title: ann.title } });
    if (!existing) await prisma.announcement.create({ data: { mosqueId: mosque2.id, ...ann } });
  }
  console.log(`✓ Announcements for mosque 2`);

  const fm2existing = await prisma.flashMessage.findFirst({ where: { mosqueId: mosque2.id } });
  if (!fm2existing) {
    await prisma.flashMessage.createMany({
      data: [
        { mosqueId: mosque2.id, content: "Veuillez éteindre vos téléphones pendant la prière.", enabled: true },
        { mosqueId: mosque2.id, content: "Le restaurant de la Mosquée est ouvert de 12h à 22h.", enabled: true },
      ],
    });
  }
  console.log(`✓ Flash messages for mosque 2`);

  await prisma.event.findFirst({ where: { mosqueId: mosque2.id } }) || await prisma.event.createMany({
    data: [
      { mosqueId: mosque2.id, title: "Conférence islamique annuelle", description: "Conférence sur la spiritualité islamique avec des érudits internationaux.", category: "conference", startsAt: new Date(`${year}-09-10T14:00:00Z`), endsAt: new Date(`${year}-09-10T18:00:00Z`), location: "Salle de conférences" },
      { mosqueId: mosque2.id, title: "Iftar Ramadan", description: "Rupture collective du jeûne. Ouvert à tous.", category: "prayer", startsAt: new Date(`${year}-03-10T18:30:00Z`), endsAt: new Date(`${year}-03-10T21:00:00Z`), location: "Salle des fêtes" },
    ],
  });
  console.log(`✓ Events for mosque 2`);

  // ── Mosque 3: Al Noor Mosque, Dubai (offline) ─────────────────────────────────
  const mosque3 = await prisma.mosque.upsert({
    where: { slug: "al-noor-dubai" },
    update: {},
    create: {
      slug: "al-noor-dubai",
      name: "Al Noor Mosque",
      address: "Khalid Lagoon, Sharjah",
      city: "Sharjah",
      zipcode: "00000",
      countryCode: "AE",
      latitude: 25.3462,
      longitude: 55.3793,
      timezone: "Asia/Dubai",
      phone: "+97165555555",
      email: "alnoor@example.ae",
      showOnMap: true,
      status: MosqueStatus.OFFLINE,
      facilities: { parking: true, womenSection: true, wheelchairAccess: true, wuduFacilities: true, airConditioning: true },
      capacityMen: 800,
      capacityWomen: 400,
    },
  });
  console.log(`✓ Mosque 3: ${mosque3.name} (OFFLINE)`);

  await prisma.mosqueConfig.upsert({
    where: { mosqueId: mosque3.id },
    update: {},
    create: {
      mosqueId: mosque3.id,
      regional: { timezone: "Asia/Dubai", calculationMethod: "Umm Al-Qura University", juristicMethod: "Shafi" },
      iqama: { enabled: true, fajr: 25, dhuhr: 20, asr: 20, maghrib: 10, isha: 20 },
      jumua: { time1: "12:15" },
      display: { showFajrEnd: false, showHijri: true, showTemp: true },
      content: { randomHadith: true, hadithInterval: 300 },
      eid: { enabled: false },
    },
  });

  await prisma.subscription.upsert({
    where: { mosqueId: mosque3.id },
    update: {},
    create: { mosqueId: mosque3.id, plan: "free", status: "active" },
  });

  await prisma.mosqueUser.upsert({
    where: { userId_mosqueId: { userId: admin.id, mosqueId: mosque3.id } },
    update: {},
    create: { userId: admin.id, mosqueId: mosque3.id, role: Role.SUPER_ADMIN },
  });

  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials:");
  console.log("  Super Admin  — admin@mawaqit.local   / Admin@123456");
  console.log("  Mosque Admin — imam@alazhar.lk        / Imam@123456");
  console.log("  Staff        — staff@paris-mosque.fr  / Staff@123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
