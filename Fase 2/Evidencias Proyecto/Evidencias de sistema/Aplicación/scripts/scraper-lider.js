import { chromium } from "playwright";
import fs from "fs";
import { connectDB, getDB } from "../config/db.js";

const COOKIES = JSON.parse(fs.readFileSync("./cookies/lider.json", "utf8"));
const URL = "https://super.lider.cl/";

async function entrarLider() {
  await connectDB();
  const db = getDB();

  const browser = await chromium.launchPersistentContext(
    "./perfil-real-lider",
    {
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--start-maximized"
      ],
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36"
    }
  );

  const page = await browser.newPage();

  // 👉 Insertar cookies reales
  await page.context().addCookies(COOKIES);

  console.log("🔒 Cookies cargadas. Entrando a Líder…");

  await page.goto(URL, { waitUntil: "networkidle" });

  console.log("🎉 ¡Entraste sin CAPTCHA!");

  await page.waitForTimeout(5000); // observar

  await browser.close();
}

entrarLider();
