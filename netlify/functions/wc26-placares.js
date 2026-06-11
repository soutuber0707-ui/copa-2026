// netlify/functions/wc26-placares.js
// Proxy para placares da Copa 2026. Ele evita CORS e normaliza os nomes para bater
// com a tabela em português do index.html.

const API_URL = "https://worldcup26.ir/get/games";

const EN_TO_PT = {
  "Mexico":"México", "South Africa":"África do Sul", "Canada":"Canadá", "Bosnia and Herzegovina":"Bósnia e Herzegovina", "Bosnia & Herzegovina":"Bósnia e Herzegovina",
  "Brazil":"Brasil", "Morocco":"Marrocos", "Haiti":"Haiti", "Scotland":"Escócia", "South Korea":"Coreia do Sul", "Czech Republic":"Tchéquia", "Czechia":"Tchéquia",
  "Australia":"Austrália", "Germany":"Alemanha", "Curacao":"Curaçao", "Curaçao":"Curaçao", "Ivory Coast":"Costa do Marfim", "Côte d'Ivoire":"Costa do Marfim",
  "Ecuador":"Equador", "Switzerland":"Suíça", "Qatar":"Catar", "Netherlands":"Países Baixos", "Japan":"Japão", "Senegal":"Senegal", "Norway":"Noruega",
  "France":"França", "Argentina":"Argentina", "Algeria":"Argélia", "Jordan":"Jordânia", "Portugal":"Portugal", "Uzbekistan":"Uzbequistão",
  "Colombia":"Colômbia", "England":"Inglaterra", "Croatia":"Croácia", "Ghana":"Gana", "Panama":"Panamá", "Spain":"Espanha", "Cape Verde":"Cabo Verde",
  "Saudi Arabia":"Arábia Saudita", "Uruguay":"Uruguai", "Belgium":"Bélgica", "Egypt":"Egito", "Iran":"Irã", "New Zealand":"Nova Zelândia", "Turkey":"Turquia", "Turkiye":"Turquia",
  "DR Congo":"RD Congo", "Austria":"Áustria", "Tunisia":"Tunísia", "Iraq":"Iraque", "Sweden":"Suécia", "USA":"Estados Unidos", "United States":"Estados Unidos", "United States of America":"Estados Unidos"
};

function pt(name){
  const s = String(name || "").trim();
  return EN_TO_PT[s] || s;
}
function readScore(v){
  if(v === undefined || v === null || v === "") return undefined;
  if(typeof v === "object") v = v.score ?? v.Score ?? v.value ?? v.Value;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function pick(obj, keys){
  for(const k of keys){
    if(obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return undefined;
}
function normalizeGame(g){
  const homeRaw = pick(g,["home_team_name_en","home_team_name_pt","home_team_label","home","homeTeam","mandante","casa"]);
  const awayRaw = pick(g,["away_team_name_en","away_team_name_pt","away_team_label","away","awayTeam","visitante","fora"]);
  const elapsed = pick(g,["time_elapsed","timeElapsed","elapsed","minute","clock","tempo"]) || "";
  const finished = String(g.finished || "").toLowerCase();
  let status = pick(g,["status","matchStatus","situacao","estado"]) || elapsed || "scheduled";
  if(finished === "true") status = "finished";
  if(String(elapsed).toLowerCase().includes("live")) status = "live";

  return {
    home: pt(homeRaw),
    away: pt(awayRaw),
    utc: pick(g,["utc","local_date","date","datetime","startTime","data"]) || "",
    homeScore: readScore(g.home_score ?? g.homeScore ?? g.scoreHome ?? g.homeGoals),
    awayScore: readScore(g.away_score ?? g.awayScore ?? g.scoreAway ?? g.awayGoals),
    status,
    minute: elapsed,
    group: g.group,
    round: g.matchday || g.round,
    updatedAt: new Date().toISOString(),
    source: "worldcup26.ir"
  };
}
function listFrom(data){
  if(Array.isArray(data)) return data;
  return data.games || data.matches || data.scores || data.data?.games || data.data?.matches || [];
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
        "User-Agent": "Mozilla/5.0 Copa2026LiveScore/2.0"
      }
    });
    const raw = await res.text();
    if(!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error:"API HTTP "+res.status, raw: raw.slice(0,500) }) };
    let data;
    try{ data = JSON.parse(raw); }catch(e){ return { statusCode: 502, headers, body: JSON.stringify({ error:"API não retornou JSON", raw: raw.slice(0,500) }) }; }
    const games = listFrom(data);
    const matches = games.map(normalizeGame).filter(m => m.home && m.away);
    return { statusCode: 200, headers, body: JSON.stringify({ matches, count: matches.length, fetchedAt: new Date().toISOString() }) };
  }catch(err){
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err && err.message || err), fetchedAt: new Date().toISOString() }) };
  }
};
