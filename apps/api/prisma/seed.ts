import { PrismaClient, Role, MosqueStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  console.log("Seeding database...");

  // SUPER_ADMIN user
  const adminEmail = "admin@mawaqit.local";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await hashPassword("Admin@123456"),
      firstName: "Platform",
      lastName: "Admin",
      role: Role.SUPER_ADMIN,
      emailVerified: true,
      status: "active",
    },
  });
  console.log(`✓ SUPER_ADMIN: ${admin.email} (id: ${admin.id})`);

  // Demo mosque
  const mosque = await prisma.mosque.upsert({
    where: { slug: "al-azhar-galgamuwa" },
    update: {},
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
      phone: "+94370000000",
      email: "alazhar@example.com",
      showOnMap: true,
      status: MosqueStatus.ONLINE,
      facilities: { parking: true, womenSection: true, wheelchairAccess: false },
      capacityMen: 500,
      capacityWomen: 200,
    },
  });
  console.log(`✓ Mosque: ${mosque.name} (id: ${mosque.id})`);

  // MosqueConfig
  await prisma.mosqueConfig.upsert({
    where: { mosqueId: mosque.id },
    update: {},
    create: {
      mosqueId: mosque.id,
      regional: { locale: "en", calendarSystem: "gregorian", hijriAdjustment: 0 },
      athan: { fajr: "default", dhuhr: "default", asr: "default", maghrib: "default", isha: "default" },
      iqama: { fajr: 20, dhuhr: 10, asr: 10, maghrib: 5, isha: 15 },
      jumua: { time1: "12:30", time2: null, khutbaDurationMin: 30 },
      display: { theme: "dark", showShuruq: true, showHijriDate: true, backgroundColor: "#1a1a2e" },
      eid: { show: false },
      content: { welcomeMessage: "Welcome to Al Azhar Jumma Masjid" },
      durations: { beforePrayer: 10, afterPrayer: 5 },
    },
  });
  console.log(`✓ MosqueConfig created`);

  // Link admin to mosque as MOSQUE_ADMIN
  await prisma.mosqueUser.upsert({
    where: { userId_mosqueId: { userId: admin.id, mosqueId: mosque.id } },
    update: {},
    create: {
      userId: admin.id,
      mosqueId: mosque.id,
      role: Role.MOSQUE_ADMIN,
    },
  });
  console.log(`✓ Linked admin to mosque as MOSQUE_ADMIN`);

  // Subscription
  await prisma.subscription.upsert({
    where: { mosqueId: mosque.id },
    update: {},
    create: {
      mosqueId: mosque.id,
      plan: "free",
      status: "active",
    },
  });
  console.log(`✓ Subscription (free) created`);

  // Sample prayer schedule for current year
  const year = new Date().getFullYear();
  const existing = await prisma.prayerSchedule.findUnique({
    where: { mosqueId_year: { mosqueId: mosque.id, year } },
  });

  if (!existing) {
    const schedule = await prisma.prayerSchedule.create({
      data: {
        mosqueId: mosque.id,
        source: "CALENDAR",
        year,
        days: {
          create: generateSamplePrayerDays(year),
        },
      },
    });
    console.log(`✓ PrayerSchedule ${year} with ${365} days created`);
  } else {
    console.log(`✓ PrayerSchedule ${year} already exists`);
  }

  // Sample announcement
  await prisma.announcement.upsert({
    where: { id: "seed-announcement-1" },
    update: {},
    create: {
      id: "seed-announcement-1",
      mosqueId: mosque.id,
      title: "Welcome to Al Azhar Jumma Masjid",
      type: "TEXT",
      content: "Jumu'ah Khutba begins at 12:30 PM every Friday. All brothers are welcome.",
      enabled: true,
      onMainScreen: true,
      onMobile: true,
      sortOrder: 0,
    },
  });
  console.log(`✓ Sample announcement created`);

  // Flash message
  await prisma.flashMessage.upsert({
    where: { id: "seed-flash-1" },
    update: {},
    create: {
      id: "seed-flash-1",
      mosqueId: mosque.id,
      content: "Please silence your mobile phones during prayer.",
      enabled: true,
    },
  });
  console.log(`✓ Flash message created`);

  console.log("\nSeed complete.");
  console.log(`\nAdmin login:`);
  console.log(`  Email: admin@mawaqit.local`);
  console.log(`  Password: Admin@123456`);
}

function generateSamplePrayerDays(year: number) {
  const days: {
    month: number;
    day: number;
    fajr: string;
    shuruq: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  }[] = [];

  const baseTimes: Record<number, { fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string }> = {
    1:  { fajr: "05:30", shuruq: "06:50", dhuhr: "12:15", asr: "15:30", maghrib: "18:00", isha: "19:15" },
    2:  { fajr: "05:20", shuruq: "06:40", dhuhr: "12:15", asr: "15:35", maghrib: "18:10", isha: "19:25" },
    3:  { fajr: "05:05", shuruq: "06:25", dhuhr: "12:10", asr: "15:35", maghrib: "18:20", isha: "19:35" },
    4:  { fajr: "04:50", shuruq: "06:08", dhuhr: "12:05", asr: "15:30", maghrib: "18:25", isha: "19:40" },
    5:  { fajr: "04:40", shuruq: "05:55", dhuhr: "12:00", asr: "15:25", maghrib: "18:30", isha: "19:45" },
    6:  { fajr: "04:38", shuruq: "05:50", dhuhr: "12:00", asr: "15:25", maghrib: "18:32", isha: "19:47" },
    7:  { fajr: "04:42", shuruq: "05:55", dhuhr: "12:02", asr: "15:28", maghrib: "18:30", isha: "19:45" },
    8:  { fajr: "04:50", shuruq: "06:05", dhuhr: "12:05", asr: "15:32", maghrib: "18:25", isha: "19:40" },
    9:  { fajr: "05:00", shuruq: "06:15", dhuhr: "12:05", asr: "15:32", maghrib: "18:15", isha: "19:30" },
    10: { fajr: "05:10", shuruq: "06:28", dhuhr: "12:10", asr: "15:30", maghrib: "18:05", isha: "19:20" },
    11: { fajr: "05:22", shuruq: "06:40", dhuhr: "12:12", asr: "15:25", maghrib: "17:58", isha: "19:12" },
    12: { fajr: "05:30", shuruq: "06:50", dhuhr: "12:15", asr: "15:25", maghrib: "17:55", isha: "19:10" },
  };

  const daysInMonth = [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  for (let m = 1; m <= 12; m++) {
    const t = baseTimes[m];
    for (let d = 1; d <= daysInMonth[m - 1]; d++) {
      days.push({ month: m, day: d, ...t });
    }
  }

  return days;
}

function isLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
