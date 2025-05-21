# CSDS Pre-processor

A web application that transforms CSV files from various social media platforms into the standardized format required by the Coordinated Sharing Detection Service (CSDS), which utilizes [CooRTweet](https://github.com/nicolarighetti/CooRTweet).

This work was carried out in the context of the [VERA.AI project](https://veraai.eu).

<!-- TODO: Add a screenshot of the application interface here -->

## Table of Contents

- [CSDS Pre-processor](#csds-pre-processor)
  - [🚀 Features](#features)
  - [📊 Input Formats](#input-formats)
    - [Meta Content Library (Facebook & Instagram)](#meta-content-library-facebook--instagram)
    - [TikTok Research API](#tiktok-research-api)
    - [YouTube (via YouTube Data Tools)](#youtube-via-youtube-data-tools)
    - [BlueSky (via Communalytic)](#bluesky-via-communalytic)
    - [Telegram](#telegram)
  - [📋 Output Format (CSDS)](#output-format-csds)
  - [📦 File Size Management](#file-size-management)
  - [📝 Usage](#usage)
  - [🛠️ Development](#development)
    - [Technologies](#technologies)
    - [Local Development](#local-development)
  - [🤝 Contributing](#contributing)
  - [📄 License](#license)
  - [👨‍💻 Author](#author)
  - [📚 About CooRTweet](#about-coortweet)
  - [🆕 Recent Updates (v1.2.1)](#recent-updates-v121)

## 🚀 Features

- **Multi-platform Support**: Supports data conversion from:
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

## 📊 Input Formats

The tool expects specific CSV structures and fields depending on the source platform. Key required fields for each platform are listed below:

### Meta Content Library (Facebook & Instagram)

Required fields:
- `surface.id`/`post_owner.id` (account identifier)
- `surface.name`/`post_owner.name` (account name)
- `id` (content identifier)
- `creation_time` (post timestamp)
- `text` (post text content)
- `link_attachment.link` (link URL if present, for Facebook)

### TikTok Research API

Required fields:
- `video_id` (content identifier)
- `author_name` (account identifier)
- `create_time` (post timestamp)
- Various content fields available as object_id source:
  - `video_description`
  - `voice_to_text`
  - `effect_ids`
  - `music_id`
  - `hashtag_names`

### YouTube (via YouTube Data Tools)

Required fields from [YouTube Data Tools Video List function](https://ytdt.digitalmethods.net/mod_videos_list.php):
- `videoId` (content identifier)
- `channelTitle` (channel name)
- `channelId` (account identifier)
- `publishedAt` (video timestamp)
- Content options (select one):
  - `videoTitle`
  - `videoDescription`
  - `tags`

### BlueSky (via Communalytic)

Required fields from [Communalytic](https://communalytic.org/) exports:
- `id` (content identifier)
- `username` (account identifier)
- `date` (post timestamp)
- `text` (post content)

### Telegram

Required fields:
- `channel_name` (channel name)
- `channel_id` (channel identifier)
- `message_id` (content identifier)
- `date` (message timestamp)
- `sender_id` (sender identifier)
- `post_author` (author name)
- `message_text` (message content)

Two account source options:
- Channel (uses `channel_name` and `channel_id`)
- Author (uses `post_author` and `sender_id`)

## 📋 Output Format (CSDS)

The tool generates a standardized CSV file with the following columns:

| Column | Description |
|--------|-------------|
| `account_id` | Unique ID of an account (formatted as name + ID for most platforms) |
| `content_id` | Unique ID of the content (post, video, message, etc.) |
| `object_id` | Content identifier (text, link, description, etc. based on selected option) |
| `timestamp_share` | UNIX timestamp of the content creation |

## 📦 File Size Management

The CSDS service has a 15MB file size limit. For datasets that exceed this limit, the tool offers three options:

1. **Split Into Multiple Files**: 
   - Automatically divides data into multiple files under 15MB
   - Packages results in a ZIP archive
   - Split is based on row count to ensure files stay under the limit

2. **Split By Time Period**: 
   - Divides data into separate files by time periods:
     - Weekly (7-day periods)
     - Monthly (30-day periods)
     - Quarterly (90-day periods)
   - Results bundled into a ZIP archive with appropriate naming

3. **Sample Data**: 
   - Creates a representative sample while maintaining account distribution
   - Adjustable sample size percentage (10-90%)
   - Ensures all accounts are represented in the sample
   - Preserves the original distribution of content across accounts

## 📝 Usage

1. Visit [CSDS Pre-processor](https://fabiogiglietto.github.io/csds-preprocessor/)
2. Select the source platform (Facebook, Instagram, TikTok, YouTube, BlueSky, or Telegram)
3. Choose the account source field based on your platform
4. Select the object_id source field based on your platform and needs
5. Upload your CSV file
6. Review processing feedback and row counts
7. If the file exceeds 15MB, select a file size management option
8. Download the transformed CSV file(s) ready for the CSDS

## 🛠️ Development

### Technologies

- React with TypeScript
- Vite for fast development and bundling
- TailwindCSS for styling
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

## 🤝 Contributing

Contributions are welcome and greatly appreciated! If you have an idea for a new feature, a bug fix, or an improvement, please feel free to contribute.

Here are some general guidelines:

1.  **Fork the Repository**: Start by forking the main repository to your own GitHub account.
2.  **Create a New Branch**: For each new feature or bug fix, create a new branch in your forked repository. This helps keep your changes organized. A good branch name could be `feature/your-feature-name` or `fix/issue-description`.
3.  **Write Clear Commit Messages**: Make sure your commit messages are clear and descriptive. This helps others understand the changes you've made.
4.  **Ensure Functionality**: Please ensure that your changes do not break any existing functionality. While this project may not have an extensive automated test suite, testing your changes manually is crucial.
5.  **Submit a Pull Request**: Once you're happy with your changes, submit a pull request from your branch to the main repository's `main` branch. Provide a clear description of the changes in your pull request.

We look forward to your contributions!

## 📄 License

MIT License

## 👨‍💻 Author

Fabio Giglietto - [@fabiogiglietto](https://github.com/fabiogiglietto)

## 📚 About CooRTweet

[CooRTweet](https://github.com/nicolarighetti/CooRTweet) is a flexible engine by Nicola Righetti and Paul Balluff for detecting coordinated sharing behaviors on social media. It builds on existing research to identify coordinated networks across various platforms.

## 🆕 Recent Updates (v1.2.1)

- Removed "Video Url" option from TikTok platform source
- Added Telegram support
- Fixed duplicate links in the App interface
- Improved documentation for clearer user guidance
- Implemented enhanced strategies for handling large datasets
- Added more robust error handling for CSV processing
- Optimized file splitting and sampling algorithms