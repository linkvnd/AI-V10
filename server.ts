import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);

  // Middleware để log mọi yêu cầu (giúp chẩn đoán lỗi)
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });

  // Đường dẫn kiểm tra nhanh
  app.get("/api/check", (req, res) => {
    res.json({ message: "Server is alive!", time: new Date().toISOString() });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    console.log(`Serving static files from: ${distPath}`);

    if (!fs.existsSync(distPath)) {
      console.error("LỖI: Thư mục 'dist' không tồn tại! Hãy chạy 'npm run build' trước.");
    }

    // Phục vụ các file trong thư mục dist (bao gồm cả assets)
    app.use(express.static(distPath));
    app.use("/assets", express.static(path.join(distPath, "assets")));

    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`LỖI: Không tìm thấy file index.html tại ${indexPath}`);
        res.status(404).send("Không tìm thấy file index.html. Hãy kiểm tra lại lệnh build.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
