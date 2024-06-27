import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

export function serverLaunch() {
  const app = express();
  const port = 4000;

  app.get("/", (req: express.Request, res: express.Response) => {
    res.send("このページはアクセスできません。");
  });

  app.listen(port, () => {
    console.log(`Webサーバーを起動しました（${port}）`);
  });
}

export function keepAliveServer() {
  const url = process.env.HOSTING_URL ? process.env.HOSTING_URL : "";

  setInterval(async () => {
    await fetch(url);
  }, 3 * 60 * 1000);
}
