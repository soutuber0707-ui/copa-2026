// netlify/functions/wc26-placares.js
// Proxy para placares da Copa 2026 usando a API pública WorldCup26.
// Esta função evita problemas de CORS e entrega o formato que o HTML entende.

const API_URL = "https://worldcup26.ir/get/games";

function readScore(v){
  if(v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeGame(g){
  const finished = String(g.finished || "").toLowerCase();
  const elapsed = g.time_elapsed || "";
  let status = elapsed || "notstarted";
  if(finished === "true") status = "finished";
  if(String(elapsed).toLowerCase().includes("live")) status = "live";

  return {
    home: g.home_team_name_en || g.home_team_label || g.home || "",
    away: g.away_team_name_en || g.away_team_label || g.away || "",
    utc: g.utc || g.local_date || g.date || "",
    homeScore: readScore(g.home_score ?? g.homeScore),
    awayScore: readScore(g.away_score ?? g.awayScore),
    status,
    minute: elapsed,
    group: g.group,
    round: g.matchday,
    updatedAt: new Date().toISOString(),
    source: "worldcup26.ir"
  };
}

exports.handler = async function(){
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  try{
    const res = await fetch(API_URL, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 Copa2026LiveScore/1.0"
      }
    });
    const data = await res.json().catch(async () => ({ raw: await res.text() }));
    if(!res.ok){
      return { statusCode: res.status, headers, body: JSON.stringify({ error: "API HTTP " + res.status, data }) };
    }
    const games = Array.isArray(data) ? data : (data.games || data.data?.games || data.matches || []);
    const matches = games.map(normalizeGame).filter(m => m.home && m.away);
    return { statusCode: 200, headers, body: JSON.stringify({ matches, fetchedAt: new Date().toISOString() }) };
  }catch(err){
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err && err.message || err), fetchedAt: new Date().toISOString() }) };
  }
};
