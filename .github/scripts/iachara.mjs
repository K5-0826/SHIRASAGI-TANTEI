// いあきゃらの白鷺雅のシートを取り、docs/miyabi-sheet.json（docs に反映済みの状態）と比べる。
//   node .github/scripts/iachara.mjs check  … 差分を Markdown で出力する（PRコメント用）
//   node .github/scripts/iachara.mjs update … docs/miyabi-sheet.json を最新に書き換える
// 必要な環境変数：IACHARA_FIREBASE_KEY（いあきゃらの Web 用 Firebase キー。リポジトリの Secret に入れてある）
// いあきゃらの公式APIではない。先方の仕様が変わると動かなくなる。
import fs from "node:fs";
import crypto from "node:crypto";

const SHEET_ID = 15007741;
const SNAPSHOT = new URL("../../docs/miyabi-sheet.json", import.meta.url);
const API = "https://apiv3.iachara.com/v3";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => crypto.createHash("sha256").update(s || "").digest("hex").slice(0, 16);

async function json(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${url.split("?")[0]}`);
  return res.json();
}

async function fetchSheet() {
  const key = process.env.IACHARA_FIREBASE_KEY;
  if (!key) throw new Error("IACHARA_FIREBASE_KEY が設定されていません");
  const post = (url, body) =>
    json(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  const guest = await post(`${API}/auth/guestToken`);
  const { idToken } = await post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`,
    { token: guest.token, returnSecureToken: true },
  );
  const auth = { headers: { Authorization: `Bearer ${idToken}` } };
  const sheet = (await json(`${API}/charasheet/${SHEET_ID}`, auth)).data;
  const memos = [];
  for (const id of sheet.data.additionalMemoIds || []) {
    await sleep(700); // 先方に負荷をかけないよう間を空ける
    memos.push((await json(`${API}/memo/${id}`, auth)).memo);
  }
  return { sheet, memos };
}

// HPの改修で見る項目だけを取り出す。文章はネタバレを含みうるので、本文ではなくハッシュで持つ。
function normalize({ sheet, memos }) {
  const d = sheet.data;
  const a = d.abilities;
  const val = (k) => a[k].value + a[k].fixedDiff + a[k].tmpFixedDiff;
  const p = d.profile;
  const skills = {};
  for (const cat of ["battleSkills", "searchSkills", "actionSkills", "negotiationSkills", "knowledgeSkills"]) {
    for (const s of [...d[cat].static, ...d[cat].additional]) {
      let base = s.defaultPoint;
      if (s.name === "回避") base = d.version === "6th" ? val("dex") * 2 : Math.floor(val("dex") / 2);
      if (s.name === "母国語") base = d.version === "6th" ? val("edu") * 5 : val("edu");
      const name = s.name + (s.additionalName ? `（${s.additionalName}）` : "");
      skills[name] = base + s.professionPoint + s.interestPoint + s.growthPoint + s.otherPoint;
    }
  }
  return {
    sheetId: SHEET_ID,
    profile: Object.fromEntries(
      ["name", "furi", "age", "sex", "from", "profession", "height", "weight", "hairColor", "eyeColor", "skinColor"]
        .map((k) => [k, p[k]]),
    ),
    abilities: {
      ...Object.fromEntries(["str", "con", "pow", "dex", "app", "siz", "int", "edu"].map((k) => [k, val(k)])),
      san: a.sanCurrent,
    },
    skills,
    belongings: Object.fromEntries(d.belongings.map((b) => [b.name, [b.detail, b.quantity].filter(Boolean).join(" / ")])),
    incomeAndAssets: d.incomeAndAssets,
    memo: hash(d.memo),
    additionalMemos: Object.fromEntries(memos.map((m) => [m.title, m.lock ? "パスワード付き" : hash(m.memo)])),
    passedScenarios: Object.fromEntries(d.passedScenarios.map((s) => [s.name, hash(s.memo)])),
    artifacts: Object.fromEntries(d.artifacts.map((s) => [s.name, hash(s.memo)])),
  };
}

const LABELS = {
  profile: "プロフィール", abilities: "能力値", skills: "技能", belongings: "持ち物",
  incomeAndAssets: "収入・資産", memo: "メモ（概要・来歴）", additionalMemos: "追加メモ",
  passedScenarios: "通過シナリオ", artifacts: "遭遇した神話存在など",
};
const HASHED = new Set(["memo", "additionalMemos", "passedScenarios", "artifacts"]);

function diff(before, after) {
  const lines = [];
  for (const sec of Object.keys(LABELS)) {
    const b = before[sec], a = after[sec];
    if (typeof a !== "object" || a === null) {
      if (b !== a) lines.push(`- **${LABELS[sec]}**：内容が変わった`);
      continue;
    }
    for (const k of new Set([...Object.keys(b || {}), ...Object.keys(a)])) {
      const ov = b?.[k], nv = a[k];
      if (JSON.stringify(ov) === JSON.stringify(nv)) continue;
      const where = `**${LABELS[sec]}**「${k}」`;
      if (ov === undefined) lines.push(`- ${where}：追加${HASHED.has(sec) ? "" : `（${nv}）`}`);
      else if (nv === undefined) lines.push(`- ${where}：削除`);
      else lines.push(`- ${where}：${HASHED.has(sec) ? "内容が変わった" : `${ov} → ${nv}`}`);
    }
  }
  return lines;
}

const mode = process.argv[2];
if (mode === "update") {
  const snap = normalize(await fetchSheet());
  fs.writeFileSync(SNAPSHOT, JSON.stringify(snap, null, 2) + "\n");
  console.log("docs/miyabi-sheet.json を更新しました");
} else if (mode === "check") {
  const out = ["<!-- iachara-check -->", "### いあきゃらのシートの確認", ""];
  let changed = false;
  try {
    const before = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
    const lines = diff(before, normalize(await fetchSheet()));
    changed = lines.length > 0;
    if (changed) {
      out.push(
        `[白鷺 雅のシート](https://iachara.com/view/${SHEET_ID})が、\`docs/\` に反映した時点から変わっています。`,
        "", ...lines, "",
        "このPRとは別に、`docs/miyabi.md`・`docs/miyabi-memo.md` を直して `node .github/scripts/iachara.mjs update` を実行するPRを出してください。",
        "追加・変更されたメモは、ネタバレを含まないか確かめてから載せてください。",
      );
    } else {
      out.push("`docs/` の内容はシートの最新と一致しています。");
    }
  } catch (e) {
    changed = true;
    out.push(
      e.message.includes("IACHARA_FIREBASE_KEY")
        ? "シートを取得できませんでした。リポジトリの Secret に `IACHARA_FIREBASE_KEY` が入っていません。"
        : `シートを取得できませんでした（${e.message}）。いあきゃら側の仕様が変わった可能性があります。`,
    );
  }
  console.log(out.join("\n"));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
} else {
  console.error("使い方: node .github/scripts/iachara.mjs check|update");
  process.exit(1);
}
