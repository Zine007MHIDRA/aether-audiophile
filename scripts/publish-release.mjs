import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// 1. Get credentials from git credential helper
function getGithubToken() {
  try {
    const creds = execSync("git credential fill", {
      input: "protocol=https\nhost=github.com\n",
      encoding: "utf8",
    });
    const match = creds.match(/password=(.+)/);
    return match ? match[1].trim() : null;
  } catch (err) {
    console.error("Failed to read git credentials:", err);
    return null;
  }
}

async function publishRelease() {
  const token = getGithubToken();
  if (!token) {
    throw new Error("Could not retrieve GitHub token.");
  }

  const owner = "Zine007MHIDRA";
  const repo = "aether-audiophile";
  const tagName = "v1.0.0";
  const releaseName = "Aether v1.0.0 — Audiophile Windows Desktop Release";
  const exePath = path.resolve("./dist/Aether 1.0.0.exe");

  if (!fs.existsSync(exePath)) {
    throw new Error(`Executable not found at ${exePath}`);
  }

  const stats = fs.statSync(exePath);
  console.log(`Found executable: ${exePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "Aether-Release-Bot",
    Accept: "application/vnd.github.v3+json",
  };

  // Ensure git tag exists locally & push to remote
  try {
    console.log(`Creating tag ${tagName}...`);
    try {
      execSync(`git tag -f ${tagName}`, { stdio: "inherit" });
    } catch {}
    console.log(`Pushing tag ${tagName} to origin...`);
    execSync(`git push -f origin ${tagName}`, { stdio: "inherit" });
  } catch (err) {
    console.warn("Tag push warning:", err.message);
  }

  // Check if release already exists
  console.log("Checking existing releases...");
  let release = null;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tagName}`, {
      headers,
    });
    if (res.ok) {
      release = await res.json();
      console.log(`Found existing release: ${release.html_url}`);
    }
  } catch {}

  // Create release if it doesn't exist
  if (!release) {
    console.log("Creating new GitHub release...");
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: releaseName,
        body: `### ✨ Aether — Audiophile Music Player (v1.0.0 Windows Desktop)

Welcome to the official Windows release of **Aether**.

#### What's Included:
- **Standalone Portable Executable**: \`Aether-1.0.0-Portable.exe\` (zero installation required — download and double-click to run).
- **Dual Audio Engine**: Integrated Chromium playback with automatic seamless fallback to lossless native direct streaming (\`/api/stream\`).
- **Acoustic Loudness Normalization**: Real-time LUFS leveling with peak limiter protection.
- **Acoustic Dynamics**: Crossfade blending between tracks with custom duration.
- **Visualizer & Equalizer**: Real-time frequency response spectrum and 10-band acoustic EQ.
- **Synced Lyrics & Sleep Timer**: Real-time LRCLIB synced lyrics engine and luxury sleep timer with micro-fade.

#### How to Run:
1. Download **\`Aether-1.0.0-Portable.exe\`** below.
2. Double-click to launch Aether and enjoy studio-fidelity playback.`,
        draft: false,
        prerelease: false,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create release (${createRes.status}): ${errText}`);
    }

    release = await createRes.json();
    console.log(`Release created successfully: ${release.html_url}`);
  }

  // Delete existing asset with same name if any
  const assetName = "Aether-1.0.0-Portable.exe";
  if (release.assets && release.assets.length > 0) {
    for (const asset of release.assets) {
      if (asset.name === assetName) {
        console.log(`Deleting previous asset ${asset.name} (id: ${asset.id})...`);
        await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`, {
          method: "DELETE",
          headers,
        });
      }
    }
  }

  // Upload executable asset
  console.log(`Uploading ${assetName} to GitHub Releases (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);
  const uploadUrl = release.upload_url.replace(/\{(\?name,label)?\}/, `?name=${encodeURIComponent(assetName)}`);

  const fileBuffer = fs.readFileSync(exePath);
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "Aether-Release-Bot",
      "Content-Type": "application/octet-stream",
      "Content-Length": stats.size.toString(),
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Asset upload failed (${uploadRes.status}): ${errText}`);
  }

  const uploadedAsset = await uploadRes.json();
  console.log(`✅ Asset successfully uploaded:`);
  console.log(`Download URL: ${uploadedAsset.browser_download_url}`);
  console.log(`Release URL: ${release.html_url}`);
}

publishRelease().catch((err) => {
  console.error("❌ Error publishing release:", err);
  process.exit(1);
});
