const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8"
};

const SOURCE_URLS = [
  "https://worldcup26.ir/get/games"
];

function score(v){
  if(v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function pick(obj, keys){
  for(const k of keys){
    const v = obj?.[k];
    if(v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function teamName(v){
  if(!v) return undefined;
  if(typeof v === "string") return v;
  if(typeof v === "object") return v.name || v.name_en || v.label || v.title || v.country || v.short_name;
  return String(v);
}

function normalizeStatus(item, utc){
  let raw = pick(item, ["status", "matchStatus", "situacao", "estado", "state", "time_elapsed", "elapsed", "match_status"]);
  if(String(item?.finished || "").toLowerCase() === "true") raw = "finished";
  const s = String(raw || "").toLowerCase();
  if(s.includes("live") || s.includes("ao vivo") || s.includes("1h") || s.includes("2h") || s.includes("half") || s.includes("interval")) return "live";
  if(s.includes("finish") || s.includes("final") || s.includes("encerr") || s.includes("full")) return "finished";
  if(s.includes("post") || s.includes("adiad")) return "postponed";
  if(utc && new Date(utc) > new Date()) return "scheduled";
  return raw || "scheduled";
}

function getList(data){
  if(Array.isArray(data)) return data;
  if(Array.isArray(data?.matches)) return data.matches;
  if(Array.isArray(data?.games)) return data.games;
  if(Array.isArray(data?.scores)) return data.scores;
  if(Array.isArray(data?.data?.games)) return data.data.games;
  if(Array.isArray(data?.data?.matches)) return data.data.matches;
  if(data && typeof data === "object") return Object.values(data);
  return [];
}

function normalizeItem(item){
  if(!item || typeof item !== "object") return null;
  const home = teamName(pick(item, ["home", "homeTeam", "team1", "mandante", "casa", "home_team", "home_team_name_en", "home_team_label", "home_name", "homeTeamName", "hometeam"]));
  const away = teamName(pick(item, ["away", "awayTeam", "team2", "visitante", "fora", "away_team", "away_team_name_en", "away_team_label", "away_name", "awayTeamName", "awayteam"]));
  if(!home || !away) return null;
  const utc = pick(item, ["utc", "date", "datetime", "startTime", "start_time", "data", "local_date", "matchDate", "kickoff"]);
  return {
    ...item,
    home,
    away,
    utc,
    group: item.group || item.groupName || item.group_name || item.pool,
    round: item.round || item.matchday || item.rodada,
    venue: item.venue || item.stadium || item.location || item.local || "",
    homeScore: score(item.homeScore ?? item.home_score ?? item.scoreHome ?? item.homeGoals ?? item.home_goals ?? item.golsCasa ?? item.placarCasa ?? item.homeTeamScore ?? item.score1),
    awayScore: score(item.awayScore ?? item.away_score ?? item.scoreAway ?? item.awayGoals ?? item.away_goals ?? item.golsFora ?? item.placarFora ?? item.awayTeamScore ?? item.score2),
    status: normalizeStatus(item, utc),
    minute: item.minute || item.min || item.tempo || item.clock || item.time_elapsed || "",
    updatedAt: new Date().toISOString()
  };
}

async function fetchJson(url){
  const res = await fetch(url, {
    headers: {"Accept":"application/json", "User-Agent":"copa-2026-netlify-function"},
    cache: "no-store"
  });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

exports.handler = async function(event){
  if(event.httpMethod === "OPTIONS") return {statusCode: 204, headers: HEADERS, body: ""};
  const errors = [];
  for(const url of SOURCE_URLS){
    try{
      const raw = await fetchJson(url + (url.includes("?") ? "&" : "?") + "v=" + Date.now());
      const matches = getList(raw).map(normalizeItem).filter(Boolean);
      if(!matches.length) throw new Error("A fonte respondeu, mas sem jogos reconhecidos.");
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({source: url, updatedAt: new Date().toISOString(), matches})
      };
    }catch(err){
      errors.push({url, error: err.message});
    }
  }
  return {
    statusCode: 502,
    headers: HEADERS,
    body: JSON.stringify({error: "Não consegui buscar placares online.", errors})
  };
};
