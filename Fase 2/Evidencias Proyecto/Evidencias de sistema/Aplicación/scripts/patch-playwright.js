export async function antiDetect(page) {
  await page.addInitScript(() => {
    // ❌ Eliminar WebDriver
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });

    // 🧠 Plugins falsos
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3],
    });

    // 🌎 Idiomas
    Object.defineProperty(navigator, "languages", {
      get: () => ["es-CL", "es", "en"],
    });

    // 💻 Hardware fingerprint fake
    Object.defineProperty(navigator, "hardwareConcurrency", {
      get: () => 8,
    });

    // GPU Fake
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return "NVIDIA RTX 3060"; // GPU Fake
      return getParameter(param);
    };
  });
}
