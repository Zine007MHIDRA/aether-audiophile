# Music Upload Staging Folder

Drop your audio files or albums into this folder before uploading them to your Azure `music` container.

### Supported Formats
- `.mp3`
- `.flac`
- `.m4a` / `.aac`
- `.ogg`
- `.wav`

### Recommended Folder Structure (Optional but clean)
You can organize them by Artist and Album, or just drop tracks directly:

```text
music/
├── Artist Name/
│   └── Album Name/
│       ├── 01 - Song Title.mp3
│       └── 02 - Song Title.flac
└── Another Song.mp3
```

### How to Upload to Azure
1. Open **Azure Storage Explorer** on Windows.
2. Navigate to: `Storage Accounts` -> `mystreammusic2026` -> `Blob Containers` -> `music`.
3. Click **Upload** -> **Upload Folder...** (or **Upload Files...**).
4. Select the contents of this folder or the folder itself to upload to Azure.
