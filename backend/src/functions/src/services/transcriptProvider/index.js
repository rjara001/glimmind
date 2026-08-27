const { fetchTranscript } = require('youtube-transcript');

const TRANSCRIPT_FETCH_ATTEMPTS = 2;
const AVAILABLE_LANGUAGES_PATTERN = /Available languages:\s*([\s\S]+)$/;
const WATCH_PAGE_ATTEMPTS = 3;
const WATCH_PAGE_RETRY_DELAY_MS = 1500;
const WATCH_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractAvailableLanguages(errorMessage) {
  const match = String(errorMessage || "").match(AVAILABLE_LANGUAGES_PATTERN);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function parseYtInitialPlayerResponse(html) {
  const startToken = "var ytInitialPlayerResponse = ";
  const startIndex = html.indexOf(startToken);
  if (startIndex === -1) return null;
  const jsonStart = startIndex + startToken.length;
  let depth = 0;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parseCaptionXml(xml) {
  const items = [];
  // srv3 format: <p t="ms" d="ms"><s>word</s></p>
  const pRegex = /<p[^>]*\bt="(\d+)"[^>]*\bd="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(xml)) !== null) {
    const text = decodeEntities(match[3].replace(/<[^>]+>/g, "")).trim();
    if (!text) continue;
    items.push({
      text,
      startSeconds: parseInt(match[1], 10) / 1000,
      durationSeconds: parseInt(match[2], 10) / 1000,
    });
  }
  if (items.length > 0) return items;
  // classic format: <text start="s" dur="s">content</text>
  const classicRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  while ((match = classicRegex.exec(xml)) !== null) {
    const text = decodeEntities(match[3]).trim();
    if (!text) continue;
    items.push({
      text,
      startSeconds: parseFloat(match[1]),
      durationSeconds: parseFloat(match[2]),
    });
  }
  return items;
}

function pickEnglishTrack(tracks) {
  const englishish = (track) => /^en(-|$)/.test(track.languageCode || "");
  const manual = tracks.find((track) => englishish(track) && track.kind !== "asr");
  return manual || tracks.find((track) => englishish(track)) || null;
}

// Watch-page fallback: YouTube's anti-bot can hide captions from the library's
// web fallback (it only detects g-recaptcha, not the LOGIN_REQUIRED interstitial).
// This path also distinguishes videos with captions in other languages vs. none
// at all vs. a bot wall.
async function extractEnglishFromWatchPage(videoId) {
  for (let attempt = 0; attempt < WATCH_PAGE_ATTEMPTS; attempt++) {
    let response;
    let html = "";
    try {
      response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { "User-Agent": WATCH_USER_AGENT, "Accept-Language": "en" },
      });
      html = await response.text();
    } catch (error) {
      console.error(`[YouTubeTranscriptProvider] watch-page fetch attempt ${attempt + 1} failed:`, error.message);
      await sleep(WATCH_PAGE_RETRY_DELAY_MS);
      continue;
    }

    const playerResponse = parseYtInitialPlayerResponse(html);
    if (!playerResponse) {
      await sleep(WATCH_PAGE_RETRY_DELAY_MS);
      continue;
    }

    const playability = playerResponse?.playabilityStatus?.status;
    if (!playability || playability === "LOGIN_REQUIRED" || playability === "UNPLAYABLE") {
      // Anti-bot wall or transient failure: retry before reporting a block.
      await sleep(WATCH_PAGE_RETRY_DELAY_MS);
      continue;
    }

    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return { kind: "no-captions", otherLanguages: [] };
    }

    const englishTrack = pickEnglishTrack(tracks);
    if (!englishTrack) {
      const otherLanguages = [...new Set(tracks.map((track) => String(track.languageCode || "").toLowerCase()))];
      return { kind: "other-languages", otherLanguages };
    }

    try {
      const captionResponse = await fetch(englishTrack.baseUrl, {
        headers: { "User-Agent": WATCH_USER_AGENT, "Accept-Language": "en" },
      });
      if (!captionResponse.ok) {
        await sleep(WATCH_PAGE_RETRY_DELAY_MS);
        continue;
      }
      const xml = await captionResponse.text();
      const segments = parseCaptionXml(xml);
      if (segments.length === 0) {
        await sleep(WATCH_PAGE_RETRY_DELAY_MS);
        continue;
      }
      return { kind: "success", segments, language: "en" };
    } catch (error) {
      console.error(`[YouTubeTranscriptProvider] caption fetch failed:`, error.message);
      await sleep(WATCH_PAGE_RETRY_DELAY_MS);
    }
  }
  return { kind: "blocked" };
}

const YouTubeTranscriptProvider = {
  // Only English transcripts are used for vocabulary extraction. Returns:
  // - { segments, language } when an English transcript is available.
  // - { segments: [], language: null, otherLanguages: [...] } when the video has
  //   captions in other languages but none in English.
  // - { segments: [], language: null, blocked: true } when YouTube gates access
  //   with an anti-bot check.
  // - null when no transcript is available in any language.
  async getTranscript(source) {
    const videoId = source.videoId;
    if (!videoId) return null;

    let otherLanguages = [];
    for (let attempt = 0; attempt < TRANSCRIPT_FETCH_ATTEMPTS; attempt++) {
      try {
        const transcript = await fetchTranscript(videoId, {
          lang: "en"
        });

        const segments = transcript.map((item) => ({
          text: item.text,
          start: item.offset / 1000,
          duration: (item.duration || 0) / 1000
        }));

        return {
          segments,
          language: "en"
        };
      } catch (error) {
        const message = String(error.message || "");
        console.error(`[YouTubeTranscriptProvider] library attempt ${attempt + 1}/${TRANSCRIPT_FETCH_ATTEMPTS} failed:`, message.slice(0, 300));

        if (message.includes("Available languages:")) {
          otherLanguages = extractAvailableLanguages(message);
          break;
        }
        await sleep(500);
      }
    }

    if (otherLanguages.length > 0) {
      return {
        segments: [],
        language: null,
        otherLanguages
      };
    }

    // The library reported no English transcript; verify with the watch page,
    // which also surfaces captions hidden behind YouTube's anti-bot wall.
    const fallback = await extractEnglishFromWatchPage(videoId);
    if (fallback.kind === "success") {
      return { segments: fallback.segments, language: fallback.language };
    }
    if (fallback.kind === "other-languages") {
      return { segments: [], language: null, otherLanguages: fallback.otherLanguages };
    }
    if (fallback.kind === "blocked") {
      return { segments: [], language: null, blocked: true };
    }
    return null;
  }
};

module.exports = {
  YouTubeTranscriptProvider
};