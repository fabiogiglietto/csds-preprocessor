# CSDS Pre-processor

A web application that transforms CSV files from various social media platforms into the format required by the [Coordinated Sharing Detection Service](https://coortweet.lab.atc.gr/) powered by [CooRTweet](https://github.com/nicolarighetti/CooRTweet).

This work was carried out in the context of the [VERA.AI project](https://veraai.eu).

## Features

- **Multi-platform Support**: Converts data from various platforms to CSDS format:
  - Meta Content Library (Facebook and Instagram)
  - TikTok Research API
  - YouTube (via YouTube Data Tools)
  - BlueSky (via Communalytic)
  - Telegram
- **Flexible Data Mapping**:
  - Customizable account source selection (e.g., post owner vs. surface for Meta platforms)
  - Multiple object ID source options for each platform (e.g., text content, links, descriptions)
  - Platform-specific field mappings with proper validation
- **Advanced File Size Management**:
  - Automatic file splitting for large datasets (>15MB)
  - Time-based splitting (weekly, monthly, quarterly) for temporal analysis
  - Stratified sampling that maintains account distribution with adjustable sample percentage
- **Data Processing Features**:
  - Client-side processing (privacy-focused - no data sent to any server)
  - Detailed processing feedback with counts of processed and skipped rows
  - Automatic timestamp conversion to UNIX format
  - CSV validation with error handling and feedback
- **Export Options**:
  - Direct CSV download for standard-sized files
  - ZIP archive download for split files
  - Descriptive naming conventions for output files

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
- Various content fields available as object_id source:
  - video_description
  - voice_to_text
  - video_url
  - effect_ids
  - music_id
  - hashtag_names

### YouTube (via YouTube Data Tools)

The tool supports CSV files from the [YouTube Data Tools Video List function](https://ytdt.digitalmethods.net/mod_videos_list.php) with the following required fields:
- videoId (content identifier)
- channelTitle (channel name)
- channelId (account identifier)
- publishedAt (video timestamp)
- Content options (select one):
  - videoTitle
  - videoDescription
  - tags

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

Two account source options:
- Channel (uses channel_name and channel_id)
- Author (uses post_author and sender_id)

## Output Format (CSDS)

Regardless of the input source, the tool generates a standardized CSV file with the following columns:

- `account_id`: Unique ID of an account (formatted as name + ID for most platforms)
- `content_id`: Unique ID of the content (post, video, message, etc.)
- `object_id`: Content identifier (text, link, description, etc. based on selected option)
- `timestamp_share`: UNIX timestamp of the content creation

## File Size Management

The CSDS service has a 15MB file size limit. For datasets that exceed this limit, the tool offers three options:

1. **Split Into Multiple Files**: Automatically divides your data into multiple files under 15MB each and packages them in a ZIP archive. The split is based on row count to ensure files stay under the limit.

2. **Split By Time Period**: Divides data into separate files by time periods for more focused analysis:
   - Weekly (7-day periods)
   - Monthly (30-day periods)
   - Quarterly (90-day periods)
   Files are bundled into a ZIP archive with appropriate naming.

3. **Sample Data**: Creates a representative sample while maintaining account distribution:
   - Adjustable sample size percentage (10-90%)
   - Ensures all accounts are represented in the sample
   - Preserves the original distribution of content across accounts

## Usage

1. Visit [https://fabiogiglietto.github.io/csds-preprocessor/](https://fabiogiglietto.github.io/csds-preprocessor/)
2. Select the source platform (Facebook, Instagram, TikTok, YouTube, BlueSky, or Telegram)
3. Choose the account source field based on your platform
4. Select the object_id source field based on your platform and needs
5. Upload your CSV file
6. Review processing feedback and row counts
7. If the file exceeds 15MB, select a file size management option
8. Download the transformed CSV file(s) ready for the [Coordinated Sharing Detection Service](https://coortweet.lab.atc.gr/) powered by [CooRTweet](https://github.com/nicolarighetti/CooRTweet)

## Development

Built with:
- React + TypeScript
- Vite
- TailwindCSS
- Papa Parse for CSV handling
- JSZip for file compression

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

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## License

MIT License

## Author

Fabio Giglietto - [@fabiogiglietto](https://github.com/fabiogiglietto)

## About CooRTweet

[CooRTweet](https://github.com/nicolarighetti/CooRTweet) is a flexible engine that detects coordinated sharing behavior on social media platforms. Developed by Nicola Righetti and Paul Balluff, it builds on existing research on coordinated behavior to provide a tool for detecting various coordinated networks across multiple social media platforms.