import { Knex } from "knex";

export class Replication {
  primaryClient: Knex;
  secoundaryClient: Knex;

  constructor({ primaryDB, secoundaryDB }: { primaryDB: Knex; secoundaryDB: Knex }) {
    this.primaryClient = primaryDB;
    this.secoundaryClient = secoundaryDB;
  }

  async replicateDB(tableName: string) {
    const hasTable = await this.hasTableChecker(tableName);
    if (hasTable) {
      await this.replicateUpsert(tableName);
      await this.replicateDelete(tableName);
    } else {
      console.log(`「${tableName}」テーブルが存在しないため実行できませんでした。`);
    }
  }

  async hasTableChecker(tableName: string) {
    const [primaryClient, secoundaryClient] = await Promise.all([
      this.primaryClient.raw(`SELECT to_regclass(?) IS NOT NULL AS exists`, [`public.${tableName}`]),
      this.secoundaryClient.raw(`SELECT to_regclass(?) IS NOT NULL AS exists`, [`public.${tableName}`]),
    ]);

    if (primaryClient.rows[0].exists && secoundaryClient.rows[0].exists) {
      return true;
    }
    return false;
  }

  async replicateUpsert(tableName: string) {
    const originalData: any = await this.primaryClient(tableName).returning("*").where("replicate_status", "pending").update({
      replicate_status: "running",
    });

    if (originalData.length > 0) {
      const filteredRows = originalData.map((row: any) => {
        const { replicate_status, ...rest } = row;
        return rest;
      });

      const targetRowIds = originalData.map((row: any) => {
        const { id } = row;
        return id;
      });

      await this.secoundaryClient(tableName).insert(filteredRows).onConflict("id").merge();

      await this.primaryClient(tableName).whereIn("id", targetRowIds).update({
        replicate_status: "done",
      });
    }
  }

  async replicateDelete(tableName: string) {
    const originalData: any = await this.primaryClient(tableName).returning("*").where("replicate_status", "delete").update({
      replicate_status: "running",
    });

    if (originalData.length > 0) {
      const targetRowIds = originalData.map((row: any) => {
        const { id } = row;
        return id;
      });

      await Promise.all([
        this.secoundaryClient(tableName).whereIn("id", targetRowIds).delete(),
        this.primaryClient(tableName).whereIn("id", targetRowIds).delete(),
      ]);
    }
  }
}
