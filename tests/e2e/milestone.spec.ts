import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import sharp from "sharp";

// Milestone 1, end to end in a real browser against a production build:
// a tradesperson registers → an admin reviews and approves → a customer
// searches, registers and sends a job request with a photo → the tradesperson
// responds → the customer books → both see the booking → work is completed
// and confirmed → the platform fee is recorded (not charged).

config({ path: ".env.e2e", override: true });
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
test.afterAll(() => db.$disconnect());

const ADMIN = { email: process.env.SEED_ADMIN_EMAIL!, password: process.env.SEED_ADMIN_PASSWORD! };
const PASSWORD = "e2e-password-1234";

/** Reads the newest link for `pathPrefix` from the captured (test) e-mails. */
async function emailLink(to: string, pathPrefix: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const mail = await db.emailOutbox.findFirst({ where: { toEmail: to }, orderBy: { createdAt: "desc" } });
    const match = mail?.textBody.match(new RegExp(`https?://[^\\s]+${pathPrefix}[^\\s]*`));
    if (match) return new URL(match[0]).pathname + new URL(match[0]).search;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No e-mail with ${pathPrefix} for ${to}`);
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/innskraning");
  await page.getByLabel("Netfang").fill(email);
  await page.getByLabel("Lykilorð").fill(password);
  await page.getByRole("button", { name: "Skrá inn" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/innskraning"));
}

async function verifyEmail(page: Page, email: string) {
  await page.goto(await emailLink(email, "/stadfesta-netfang"));
  await page.getByRole("button", { name: "Staðfesta" }).click();
  await expect(page.getByText("Netfangið þitt hefur verið staðfest")).toBeVisible();
}

async function newPage(browser: Browser, contextOptions: Parameters<Browser["newContext"]>[0]) {
  const ctx = await browser.newContext(contextOptions);
  return ctx.newPage();
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(1);
}

test("tradesperson → admin → customer → booking → completion → fee recorded", async ({ browser, playwright }, testInfo) => {
  const run = `${testInfo.project.name}-${Date.now()}`;
  const proEmail = `pro-${run}@example.is`;
  const customerEmail = `customer-${run}@example.is`;
  const businessName = `Lagnaþjónusta ${testInfo.project.name === "mobile" ? "Farsími" : "Skjáborð"} ${Date.now() % 10000}`;
  const device = testInfo.project.use;
  const ctxOptions = { viewport: device.viewport, userAgent: device.userAgent, isMobile: device.isMobile, hasTouch: device.hasTouch, deviceScaleFactor: device.deviceScaleFactor, locale: "is-IS", timezoneId: "Atlantic/Reykjavik" };
  void playwright;

  // ── 1. Tradesperson registers and completes the profile ──
  const pro = await newPage(browser, ctxOptions);
  await pro.goto("/nyskraning/fagadili");
  await pro.getByLabel("Nafn fyrirtækis").fill(businessName);
  await pro.getByLabel("Nafn tengiliðar").fill("Jón Jónsson");
  await pro.getByLabel("Netfang").fill(proEmail);
  await pro.getByLabel("Lykilorð").fill(PASSWORD);
  await pro.getByRole("checkbox", { name: /Ég samþykki/ }).check();
  await pro.getByRole("button", { name: "Skrá fyrirtæki" }).click();
  await pro.waitForURL("**/fagadili/profill**");
  await noHorizontalScroll(pro);

  // Submitting an incomplete profile is refused with a clear message.
  await pro.getByRole("button", { name: "Senda til yfirferðar" }).click();
  await expect(pro.getByText(/Fylltu út lýsingu/)).toBeVisible();

  await pro.getByLabel("Lýsing").fill("Við tökum að okkur pípulagnir, viðgerðir á lekum og uppsetningu blöndunartækja á höfuðborgarsvæðinu.");
  await pro.getByLabel("Sími fyrir viðskiptavini").fill("611 2233");
  await pro.getByRole("checkbox", { name: "Pípari", exact: true }).check();
  await pro.getByRole("checkbox", { name: "Reykjavík" }).check();
  await pro.getByRole("button", { name: "Senda til yfirferðar" }).click();
  await expect(pro.getByText("Prófíllinn hefur verið sendur til yfirferðar.")).toBeVisible();

  await pro.getByLabel("Heiti", { exact: true }).fill("Sveinsbréf í pípulögnum");
  await pro.getByLabel("Útgefandi").fill("Menntamálaráðuneytið");
  await pro.getByRole("button", { name: "Bæta við réttindum" }).click();
  await expect(pro.getByText("Bíður staðfestingar")).toBeVisible();

  await verifyEmail(pro, proEmail);

  // Not yet public: the profile is not in search before approval.
  await pro.goto(`/leit?flokkur=pipari&svaedi=reykjavik&q=${encodeURIComponent(businessName)}`);
  await expect(pro.getByText("Enginn fagaðili fannst")).toBeVisible();

  // ── 2. Administrator reviews: verifies the qualification and approves ──
  const admin = await newPage(browser, ctxOptions);
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/stjornbord/fagadilar");
  await admin.getByRole("link", { name: businessName }).click();
  await admin.getByLabel("Hvernig var staðfest?").fill("Flett upp í skrá yfir sveinsbréf");
  await admin.getByRole("button", { name: "Staðfesta", exact: true }).click();
  await expect(admin.getByText("Staðfest", { exact: true })).toBeVisible();
  await admin.getByRole("button", { name: "Samþykkja prófíl" }).click();
  await expect(admin.getByText("Prófíll samþykktur.")).toBeVisible();
  expect(await db.auditLog.count({ where: { action: "profile.approved" } })).toBeGreaterThan(0);

  // ── 3. Customer finds the tradesperson and sends a job request ──
  const customer = await newPage(browser, ctxOptions);
  await customer.goto("/");
  await noHorizontalScroll(customer);
  await customer.getByLabel("Hvað þarf að gera?").selectOption("pipari");
  await customer.getByLabel("Hvar?").selectOption("reykjavik");
  await customer.getByRole("button", { name: "Finna fagfólk" }).click();
  await customer.waitForURL("**/leit?**");
  const card = customer.getByRole("article").filter({ hasText: businessName });
  await expect(card).toBeVisible();
  await expect(card.getByText("Staðfest réttindi")).toBeVisible();
  await card.getByRole("link", { name: businessName }).click();
  await expect(customer.getByRole("heading", { name: businessName })).toBeVisible();
  await customer.getByRole("link", { name: "Senda verkbeiðni" }).click();

  // Not signed in → login → create account, then back to the request form.
  await customer.waitForURL("**/innskraning?next=**");
  await customer.getByRole("link", { name: "Stofna aðgang" }).click();
  await customer.getByLabel("Fullt nafn").fill("Guðrún Sigurðardóttir");
  await customer.getByLabel("Netfang").fill(customerEmail);
  await customer.getByLabel("Símanúmer").fill("8612345");
  await customer.getByLabel("Lykilorð").fill(PASSWORD);
  await customer.getByRole("checkbox", { name: /Ég samþykki/ }).check();
  await customer.getByRole("button", { name: "Stofna aðgang" }).click();
  await customer.waitForURL("**/verkbeidni/ny?**");
  await noHorizontalScroll(customer);

  await expect(customer.getByLabel("Tegund verks")).toHaveValue(/.+/);
  await customer.getByLabel("Stutt lýsing").fill("Leki undir eldhúsvaski");
  await customer.getByLabel("Nánari lýsing").fill("Það lekur úr tengingu undir eldhúsvaskinum og botninn á skápnum er orðinn blautur.");
  const photo = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#7aa" } }).jpeg().toBuffer();
  await customer.locator('input[type="file"]').setInputFiles({ name: "leki.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(customer.getByRole("button", { name: "Fjarlægja mynd" })).toBeVisible();
  await customer.getByLabel("Heimilisfang").fill("Hverfisgata 12");
  await customer.getByLabel("Póstnúmer").fill("101");
  await customer.getByLabel("Sveitarfélag").selectOption({ label: "Reykjavík" });
  const proOption = customer.getByRole("checkbox", { name: new RegExp(businessName) });
  await expect(proOption).toBeChecked();
  await customer.getByRole("button", { name: "Senda verkbeiðni" }).click();

  // E-mail not verified yet → saved as a draft and sent after verification.
  await customer.waitForURL("**/minar-sidur/beidnir/**");
  await expect(customer.getByText("Beiðnin er vistuð")).toBeVisible();
  const requestUrl = customer.url();
  await verifyEmail(customer, customerEmail);
  await customer.goto(requestUrl);
  await expect(customer.getByText("Bíður svara").first()).toBeVisible();

  // ── 4. Tradesperson accepts the request with a fixed price and a time ──
  await pro.goto("/fagadili");
  await pro.getByRole("link", { name: /Leki undir eldhúsvaski/ }).first().click();
  await expect(pro.getByText("Hverfisgata")).toHaveCount(0); // address hidden before booking
  await expect(pro.getByRole("img", { name: /Myndir 1/ })).toBeVisible();
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const startHour = testInfo.project.name === "mobile" ? "13" : "09";
  const endHour = testInfo.project.name === "mobile" ? "15" : "11";
  await pro.getByLabel("Upphæð (kr., með vsk.)").fill("45000");
  await pro.getByLabel("Hvað er innifalið?").fill("Vinna og akstur");
  await pro.getByLabel("Tillaga að upphafi").fill(`${tomorrow}T${startHour}:00`);
  await pro.getByLabel("Áætluð verklok").fill(`${tomorrow}T${endHour}:00`);
  await pro.getByRole("button", { name: "Senda svar" }).click();
  await expect(pro.getByText("Svar þitt hefur verið sent")).toBeVisible();

  // ── 5. Customer compares and books ──
  await customer.goto(requestUrl);
  await expect(customer.getByText("Fast verð: 45.000 kr.")).toBeVisible();
  await customer.getByRole("button", { name: `Bóka ${businessName}` }).click();
  await customer.waitForURL("**/bokanir/**");
  const bookingPath = new URL(customer.url()).pathname;
  await expect(customer.getByText("Tímasett", { exact: true })).toBeVisible();
  await noHorizontalScroll(customer);

  // ── 6. Both parties can view the booking; outsiders cannot ──
  await pro.goto(bookingPath);
  await expect(pro.getByRole("heading", { name: "Leki undir eldhúsvaski" })).toBeVisible();
  await expect(pro.getByText("Hverfisgata 12")).toBeVisible(); // address shared once booked
  await expect(pro.getByText("861 2345")).toBeVisible();
  const outsider = await newPage(browser, ctxOptions);
  await outsider.goto(bookingPath);
  await outsider.waitForURL("**/innskraning?next=**");
  const adminPageAsCustomer = await customer.goto("/stjornbord");
  expect(adminPageAsCustomer?.status()).toBe(404);

  // Messaging between the parties.
  await customer.goto(bookingPath);
  await customer.getByPlaceholder("Skrifaðu skilaboð…").fill("Hurðin er opin, lykill hjá nágranna.");
  await customer.getByRole("button", { name: "Senda", exact: true }).click();
  await pro.goto(bookingPath);
  await expect(pro.getByText("Hurðin er opin, lykill hjá nágranna.")).toBeVisible();

  // ── 7. Work done: tradesperson reports, customer confirms ──
  await pro.getByRole("button", { name: "Hefja verk" }).click();
  await expect(pro.getByText("Í vinnslu").first()).toBeVisible();
  await pro.getByRole("button", { name: "Tilkynna verklok" }).click();
  await expect(pro.getByText("Beðið eftir að viðskiptavinur staðfesti verklok.")).toBeVisible();
  const before = await db.booking.findFirstOrThrow({ where: { profile: { businessName } } });
  expect(before.status).toBe("IN_PROGRESS");
  expect(before.feeEligible).toBeNull(); // not billable until the customer confirms

  await customer.goto(bookingPath);
  await customer.getByRole("button", { name: "Já, verkinu er lokið" }).click();
  await expect(customer.getByText("Verkinu er lokið. Takk fyrir að nota Verkvang!")).toBeVisible();

  // ── 8. The fee eligibility is recorded (and nothing is charged) ──
  const done = await db.booking.findFirstOrThrow({ where: { profile: { businessName } }, include: { charge: true } });
  expect(done.status).toBe("COMPLETED");
  expect(done.source).toBe("PLATFORM");
  expect(done.feeEligible).toBe(true);
  expect(done.charge).toMatchObject({ amountIsk: 990, status: "RECORDED", planCode: "BASIC" });

  await pro.goto(bookingPath);
  await expect(pro.getByText(/Gjaldskylt: 990\skr\./)).toBeVisible();
  await pro.goto("/fagadili/gjold");
  await expect(pro.getByText("Skráð (ekki innheimt)")).toBeVisible();
  await noHorizontalScroll(pro);
  await admin.goto("/stjornbord/gjold");
  await expect(admin.getByRole("cell", { name: businessName })).toBeVisible();
});
