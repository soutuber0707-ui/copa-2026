// netlify/functions/wc26-placares.js
// Proxy para placares da Copa 2026. Corrigido para combinar os nomes do JSON com o index.html.

const API_URL = "https://worldcup26.ir/get/games";

const CANON = {
  "United States":"USA",
  "United States of America":"USA",
  "USA":"USA",
  "US":"USA",
  "Estados Unidos":"USA",
  "Estados Unidos da América":"USA",
  "Paraguay":"Paraguay",
  "Paraguai":"Paraguay",
  "Mexico":"Mexico",
  "México":"Mexico",
  "South Africa":"South Africa",
  "África do Sul":"South Africa",
  "South Korea":"South Korea",
  "Korea Republic":"South Korea",
  "Coreia do Sul":"South Korea",
  "Czechia":"Czech Republic",
  "Czech Republic":"Czech Republic",
  "Tchéquia":"Czech Republic",
  "Bosnia and Herzegovina":"Bosnia & Herzegovina",
  "Bosnia & Herzegovina":"Bosnia & Herzegovina",
  "Bósnia e Herzegovina":"Bosnia & Herzegovina",
  "Brazil":"Brazil",
  "Brasil":"Brazil",
  "Morocco":"Morocco",
  "Marrocos":"Morocco",
  "Haiti":"Haiti",
  "Scotland":"Scotland",
  "Escócia":"Scotland",
  "Australia":"Australia",
  "Austrália":"Australia",
  "Germany":"Germany",
  "Alemanha":"Germany",
  "Curacao":"Curacao",
  "Curaçao":"Curacao",
  "Ivory Coast":"Ivory Coast",
  "Côte d'Ivoire":"Ivory Coast",
  "Costa do Marfim":"Ivory Coast",
  "Ecuador":"Ecuador",
  "Equador":"Ecuador",
  "Switzerland":"Switzerland",
  "Suíça":"Switzerland",
  "Qatar":"Qatar",
  "Catar":"Qatar",
  "Netherlands":"Netherlands",
  "Países Baixos":"Netherlands",
  "Japan":"Japan",
  "Japão":"Japan",
  "Senegal":"Senegal",
  "Norway":"Norway",
  "Noruega":"Norway",
  "France":"France",
  "França":"France",
  "Argentina":"Argentina",
  "Algeria":"Algeria",
  "Argélia":"Algeria",
  "Jordan":"Jordan",
  "Jordânia":"Jordan",
  "Portugal":"Portugal",
  "Uzbekistan":"Uzbekistan",
  "Uzbequistão":"Uzbekistan",
  "Colombia":"Colombia",
  "Colômbia":"Colombia",
  "England":"England",
  "Inglaterra":"England",
  "Croatia":"Croatia",
  "Croácia":"Croatia",
  "Ghana":"Ghana",
  "Gana":"Ghana",
  "Panama":"Panama",
  "Panamá":"Panama",
  "Spain":"Spain",
  "Espanha":"Spain",
  "Cape Verde":"Cape Verde",
  "Cabo Verde":"Cape Verde",
  "Saudi Arabia":"Saudi Arabia",
  "Arábia Saudita":"Saudi Arabia",
  "Uruguay":"Uruguay",
  "Uruguai":"Uruguay",
  "Belgium":"Belgium",
  "Bélgica":"Belgium",
  "Egypt":"Egypt",
  "Egito":"Egypt",
  "Iran":"Iran",
  "Irã":"Iran",
  "New Zealand":"New Zealand",
  "Nova Zelândia":"New Zealand",
  "Turkey":"Turkey",
  "Turkiye":"Turkey",
  "Turquia":"Turkey",
  "DR Congo":"DR Congo",
  "RD Congo":"DR Congo",
  "Austria":"Austria",
  "Áustria":"Austria",
  "Tunisia":"Tunisia",
  "Tunísia":"Tunisia",
  "Iraq":"Iraq",
  "Iraque":"Iraq",
  "Sweden":"Sweden",
  "Suécia":"Sweden"
};

function canon(name){
  const s = String(name || "").trim();
  return CANON[s] || s;
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
    home: canon(homeRaw),
    away: canon(awayRaw),
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
        "User-Agent": "Mozilla/5.0 Copa2026LiveScore/1.0"
      }
    });
    const data = await res.json().catch(async () => ({ raw: await res.text() }));
    if(!res.ok){
      return { statusCode: res.status, headers, body: JSON.stringify({ error: "API HTTP " + res.status, data }) };
    }
    const matches = listFrom(data).map(normalizeGame).filter(m => m.home && m.away);
    return { statusCode: 200, headers, body: JSON.stringify({ matches, fetchedAt: new Date().toISOString() }) };
  }catch(err){
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err && err.message || err), fetchedAt: new Date().toISOString() }) };
  }
};
