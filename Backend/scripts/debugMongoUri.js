import dns from "dns/promises";
import { URL } from "url";

const uri =
  "mongodb+srv://pawan050813:BVPEMQzEWguJefOX@firstdb.jispptw.mongodb.net/Eduaitor?retryWrites=true&w=majority&appName=firstDB";

const parsed = new URL(uri);
const srv = await dns.resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
const txt = await dns.resolveTxt(parsed.hostname);

const hosts = srv.map((record) => `${record.name}:${record.port}`).join(",");
const params = new URLSearchParams(parsed.search);

for (const entry of txt.flat()) {
  for (const pair of entry.split("&")) {
    const index = pair.indexOf("=");
    if (index > 0) {
      const key = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
  }
}

const authPart = `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`;
const pathname = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
const query = params.toString();

console.log(`mongodb://${authPart}${hosts}${pathname}${query ? `?${query}` : ""}`);