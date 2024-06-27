import { serverLaunch, keepAliveServer } from "./functions/server";
import { scrapingDatabase, productionDatabase, primaryDatabase, secondaryDatabase, databaseListenStart } from "./functions/databases";

// Webサーバーを起動する
serverLaunch();

(async () => {
  keepAliveServer(); // Render.comのスピンダウン対策
  await replicateProductionToScraping(); // 本番DBからスクレイピングDBへとレプリケーション
  await replicateScrapingToProduction(); // スクレイピングDBから本番DBへとレプリケーション
})();

async function replicateScrapingToProduction() {
  const primaryClient = primaryDatabase(scrapingDatabase);
  const secoundaryClient = secondaryDatabase(productionDatabase);
  await databaseListenStart({
    primaryClient: primaryClient,
    secondaryClient: secoundaryClient,
    listenChannelName: "replication_scraping_to_production",
  });
}

async function replicateProductionToScraping() {
  const primaryClient = primaryDatabase(productionDatabase);
  const secoundaryClient = secondaryDatabase(scrapingDatabase);
  await databaseListenStart({
    primaryClient: primaryClient,
    secondaryClient: secoundaryClient,
    listenChannelName: "replication_production_to_scraping",
  });
}
