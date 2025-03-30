# CSDS Pre-processor

A web application that transforms CSV files from various social media platforms into the format required by the [Coordinated Sharing Detection Service](https://coortweet.lab.atc.gr/) powered by [CooRTweet](https://github.com/nicolarighetti/CooRTweet).

This work was carried out in the context of the [VERA.AI project](https://veraai.eu).

## Features

- Converts data from multiple platforms to CSDS format:
  - Meta Content Library (Facebook and Instagram)
  - TikTok Research API
  - YouTube (via YouTube Data Tools)
  - BlueSky (via Communalytic)
  - Telegram
- Platform-specific data mapping options
- Handles file size limitations (15MB max for CSDS)
- Provides feedback on processed and skipped rows
- Client-side processing (no data is sent to any server)

## Input Formats

### Meta Content Library (Facebook & Instagram)

The tool supports CSV files from Meta Content Library with the following required fields:
- surface.id/post_owner.id (account identifier)
- surface.name/post_owner.name (account name)
- id (content identifier)
- creation_time (post timestamp)
- text (post text content)
- link_attachment.link (link URL if present, for Facebook)

### TikTok Research API

The tool supports TikTok Research API CSV exports with the following required fields:
- video_id (content identifier)
- author_name (account identifier)
- create_time (post timestamp)
- Various content fields like video_description, voice_to_text, video_url, etc.

### YouTube (via YouTube Data Tools)

The tool supports CSV files from the [YouTube Data Tools Video List function](https://ytdt.digitalmethods.net/mod_videos_list.php) with the following required fields:
- videoId (content identifier)
- channelTitle (channel name)
- channelId (account identifier)
- publishedAt (video timestamp)
- videoTitle, videoDescription, or tags (content fields)

### BlueSky (via Communalytic)

The tool supports BlueSky data exported from [Communalytic](https://communalytic.org/) with the following required fields:
- id (content identifier)
- username (account identifier)
- date (post timestamp)
- text (post content)

### Telegram

The tool supports Telegram data with the following required fields:
- channel_name (channel name)
- channel_id (channel identifier)
- message_id (content identifier)
- date (message timestamp)
- sender_id (sender identifier)
- post_author (author name)
- message_text (message content)

## Output Format (CSDS)

Regardless of the input source, the tool generates a standardized CSV file with the following columns:

- `account_id`: Unique ID of an account
- `content_id`: Unique ID of the content (post, video, message, etc.)
- `object_id`: Content identifier (text, link, description, etc. based on selected option)
- `timestamp_share`: UNIX timestamp of the content creation

## Usage

1. Visit [https://fabiogiglietto.github.io/csds-preprocessor/](https://fabiogiglietto.github.io/csds-preprocessor/)
2. Select the source platform (Facebook, Instagram, TikTok, YouTube, BlueSky, or Telegram)
3. Choose the account source field based on your platform
4. Select the object_id source field based on your platform and needs
5. Upload your CSV file
6. Download the transformed CSV file ready for the [Coordinated Sharing Detection Service](https://coortweet.lab.atc.gr/) powered by [CooRTweet](https://github.com/nicolarighetti/CooRTweet)

## Development

Built with:
- React + TypeScript
- Vite
- TailwindCSS
- Papa Parse for CSV handling

### Local Development

```bash
# Clone the repository
git clone https://github.com/fabiogiglietto/csds-preprocessor.git

# Navigate to the project directory
cd csds-preprocessor

# Install dependencies
npm install

# Start the development server
npm run dev
```

## License

MIT License

## Author

Fabio Giglietto - [@fabiogiglietto](https://github.com/fabiogiglietto)

## About CooRTweet

[CooRTweet](https://github.com/nicolarighetti/CooRTweet) is a flexible engine that detects coordinated sharing behavior on social media platforms. Developed by Nicola Righetti and Paul Balluff, it builds on existing research on coordinated behavior to provide a tool for detecting various coordinated networks across multiple social media platforms.
