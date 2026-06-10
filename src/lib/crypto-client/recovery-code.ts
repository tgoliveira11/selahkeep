import { argon2id } from "hash-wasm";
import type { KdfMetadata } from "@/lib/validation/encrypted-payload";
import { bytesToBase64Url, base64UrlToBytes, stringToBytes, toBufferSource } from "./encoding";

const RECOVERY_WORDS_BASE = [
  "river", "candle", "forest", "window", "silver", "anchor", "harbor", "fabric",
  "lantern", "cloud", "meadow", "thunder", "crystal", "horizon", "willow", "ember",
  "canyon", "breeze", "summit", "mirror", "pebble", "aurora", "compass", "garden",
  "harvest", "journey", "kingdom", "lighthouse", "mountain", "ocean", "prairie",
  "quartz", "rainbow", "shadow", "temple", "valley", "whisper", "zenith", "bridge",
  "cascade", "dawn", "eagle", "flame", "glacier", "haven", "island", "jasmine",
  "kite", "lotus", "maple", "nebula", "orchid", "phoenix", "quill", "reef",
  "sage", "tide", "unity", "violet", "wave", "xenon", "yonder", "zephyr",
  "alpine", "birch", "cedar", "delta", "elm", "fjord", "grove", "heath",
  "iris", "jade", "kelp", "lunar", "mist", "noble", "opal", "pine",
  "quest", "ridge", "stone", "trail", "umber", "vine", "wren", "yarrow",
  "amber", "brook", "cliff", "dusk", "fern", "glen", "haze", "ink",
  "juniper", "knoll", "leaf", "moss", "nest", "oak", "pond", "root",
  "stream", "thorn", "urn", "veil", "wood", "yarn", "aspen", "coral",
  "dew", "echo", "frost", "gale", "hush", "ivy", "jewel", "knack",
  "lark", "mirth", "nook", "oasis", "plume", "quiver", "rust", "spire",
  "talon", "ultra", "vista", "wisp", "yearn", "zest", "acorn", "basin",
  "cobalt", "drift", "ember", "flint", "granite", "hollow", "inlet", "jolt",
  "keystone", "lagoon", "marble", "nectar", "onyx", "prism", "quartzite", "ripple",
  "saffron", "topaz", "upland", "verdant", "wildflower", "yonderlight", "zen", "arbor",
  "bluff", "cinder", "dapple", "evergreen", "fable", "gossamer", "heather", "indigo",
  "juniper", "kindle", "lumen", "meander", "northstar", "obsidian", "petal", "quasar",
  "raven", "solstice", "tundra", "uplift", "voyage", "willowisp", "yarrowroot", "zodiac",
  "atlas", "beacon", "citrine", "dawnlight", "emberfall", "falcon", "glimmer", "harborlight",
  "ironwood", "juniper", "kestrel", "lilac", "moonrise", "nightfall", "oracle", "pinecone",
  "quillpen", "riverstone", "sunbeam", "thistle", "uplands", "violetdusk", "windward", "yonderpeak",
  "amberglow", "brookside", "cloudbank", "driftwood", "evermist", "firelight", "goldleaf", "hollowbrook",
  "ironcliff", "jadebrook", "kitehill", "larkspur", "mistvale", "northwind", "oakheart", "pebblebrook",
  "quartzfall", "riverbend", "stonepath", "timberline", "uplandtrail", "valleybrook", "whisperwind", "yarrowfield",
  "ambertrail", "blueheron", "copperleaf", "duskwood", "embertrail", "frostline", "greenvale", "harborstone",
  "ironroot", "jadeleaf", "kitepath", "larkwood", "moontrail", "nightbrook", "obsidiancliff", "pinebrook",
  "quillwood", "riverleaf", "stonebrook", "timberbrook", "uplandwood", "valleytrail", "whisperbrook", "yarrowbrook",
];

/** Minimum entropy required by ADR-001 / ADR-002. */
export const RECOVERY_CODE_MIN_ENTROPY_BITS = 128;

const RECOVERY_WORDLIST = Array.from(new Set(RECOVERY_WORDS_BASE));

/** Words per code — ceil(128 / log2(wordlist size)). */
export const RECOVERY_WORDS_PER_CODE = Math.ceil(
  RECOVERY_CODE_MIN_ENTROPY_BITS / Math.log2(RECOVERY_WORDLIST.length)
);

/** Entropy bits for a generated recovery code (uniform word selection). */
export function getRecoveryCodeEntropyBits(): number {
  return RECOVERY_WORDS_PER_CODE * Math.log2(RECOVERY_WORDLIST.length);
}

export function getRecoveryWordlistSize(): number {
  return RECOVERY_WORDLIST.length;
}

function randomWordIndex(): number {
  const wordCount = RECOVERY_WORDLIST.length;
  const maxUnbiased = Math.floor(0x1_0000_0000 / wordCount) * wordCount;
  while (true) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0];
    if (random < maxUnbiased) {
      return random % wordCount;
    }
  }
}

export function generateRecoveryCode(): string {
  const words: string[] = [];
  for (let i = 0; i < RECOVERY_WORDS_PER_CODE; i++) {
    words.push(RECOVERY_WORDLIST[randomWordIndex()]);
  }
  return words.join("-");
}

export async function deriveRecoveryKey(
  recoveryCode: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; metadata: KdfMetadata }> {
  const saltBytes = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const password = stringToBytes(recoveryCode.normalize("NFKC"));

  try {
    const hash = await argon2id({
      password,
      salt: saltBytes,
      parallelism: 1,
      iterations: 3,
      memorySize: 65536,
      hashLength: 32,
      outputType: "binary",
    });

    const key = await crypto.subtle.importKey(
      "raw",
      toBufferSource(new Uint8Array(hash)),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    return {
      key,
      metadata: {
        kdf: "argon2id",
        version: "kdf-v1",
        salt: bytesToBase64Url(saltBytes),
        memory: 65536,
        iterations: 3,
        parallelism: 1,
      },
    };
  } catch {
    // PBKDF2-SHA-256 fallback per ADR-001 when Argon2id is unavailable in the browser.
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      toBufferSource(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derived = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: toBufferSource(saltBytes),
        iterations: 600_000,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    const key = await crypto.subtle.importKey(
      "raw",
      toBufferSource(new Uint8Array(derived)),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    return {
      key,
      metadata: {
        kdf: "pbkdf2-sha256",
        version: "kdf-v1",
        salt: bytesToBase64Url(saltBytes),
        iterations: 600_000,
      },
    };
  }
}

export async function deriveRecoveryKeyFromMetadata(
  recoveryCode: string,
  metadata: KdfMetadata
): Promise<CryptoKey> {
  const saltBytes = base64UrlToBytes(metadata.salt);
  const password = stringToBytes(recoveryCode.normalize("NFKC"));

  if (metadata.kdf === "argon2id") {
    const hash = await argon2id({
      password,
      salt: saltBytes,
      parallelism: metadata.parallelism,
      iterations: metadata.iterations,
      memorySize: metadata.memory,
      hashLength: 32,
      outputType: "binary",
    });
    return crypto.subtle.importKey(
      "raw",
      toBufferSource(new Uint8Array(hash)),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toBufferSource(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toBufferSource(saltBytes),
      iterations: metadata.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(new Uint8Array(derived)),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
