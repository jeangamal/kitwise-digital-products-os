/** Renders a Wrangler config using the D1 database discovered from the Cloudflare account. */
import { readFileSync, writeFileSync } from "node:fs";
const databaseList = JSON.parse(readFileSync(process.argv[2], "utf8"));
const databases = Array.isArray(databaseList) ? databaseList : databaseList?.result;
if (!Array.isArray(databases)) throw new Error("d1_list_output_invalid");
const records = databases.filter(db => db.name === "kitwise-company-os");
if (records.length !== 1) throw new Error("expected_one_kitwise_d1_database");
const uuid = records[0].uuid || records[0].id;
if (typeof uuid !== "string" || !/^[a-f0-9-]{36}$/i.test(uuid)) throw new Error("database_identifier_missing");
const template = JSON.parse(readFileSync("cloudflare/wrangler.template.json", "utf8"));
template.d1_databases[0].database_id = uuid;
writeFileSync("cloudflare/wrangler.json", JSON.stringify(template, null, 2) + "\n");
console.log("Cloudflare Worker config generated; database ID kept out of source control.");
