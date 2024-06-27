import "dotenv/config";
import knex, { Knex } from "knex";
import { Notification } from "pg";
import { Replication } from "./replication";

interface DatabaseConnectionType {
  host: string;
  database: "postgres";
  user: string;
  password: string;
}

export const scrapingDatabase: DatabaseConnectionType = {
  host: process.env.SCRAPING_DB_HOST ? process.env.SCRAPING_DB_HOST : "",
  database: "postgres",
  user: process.env.SCRAPING_DB_USER ? process.env.SCRAPING_DB_USER : "",
  password: process.env.SCRAPING_DB_PASSWORD ? process.env.SCRAPING_DB_PASSWORD : "",
};

export const productionDatabase: DatabaseConnectionType = {
  host: process.env.PRODUCTION_DB_HOST ? process.env.PRODUCTION_DB_HOST : "",
  database: "postgres",
  user: process.env.PRODUCTION_DB_USER ? process.env.PRODUCTION_DB_USER : "",
  password: process.env.PRODUCTION_DB_PASSWORD ? process.env.PRODUCTION_DB_PASSWORD : "",
};

export function primaryDatabase(databaseConnection: DatabaseConnectionType) {
  return knex({
    client: "pg",
    connection: {
      port: 5432,
      ...databaseConnection,
    },
  });
}

export function secondaryDatabase(databaseConnection: DatabaseConnectionType) {
  return knex({
    client: "pg",
    connection: {
      port: 6543,
      ...databaseConnection,
    },
  });
}

export async function databaseListenStart({
  primaryClient,
  secondaryClient,
  listenChannelName,
}: {
  primaryClient: Knex;
  secondaryClient: Knex;
  listenChannelName: string;
}) {
  const connection = await primaryClient.client.acquireConnection();
  connection.query(`LISTEN ${listenChannelName}`);

  connection.on("notification", async (msg: Notification) => {
    const { payload } = msg;
    if (!payload) return;

    console.log(payload);

    if (payload === "keep-alive") return;

    const replication = new Replication({
      primaryDB: primaryClient,
      secoundaryDB: secondaryClient,
    });

    const tableNames = payload.split("+");

    for (let key in tableNames) {
      await replication.replicateDB(tableNames[key]);
    }
  });

  setInterval(async () => {
    connection.query(`NOTIFY ${listenChannelName}, 'keep-alive';`);
  }, 3 * 60 * 1000);
}
