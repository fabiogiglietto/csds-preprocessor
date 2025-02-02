# MCL to CSDS Pre-processor

A web application that transforms CSV files from the Meta Content Library (MCL) format into the format required by the Coordinated Sharing Detection Service (CSDS).

## Features

- Converts MCL CSV data to CSDS format
- Allows choosing between post text or link as object_id
- Handles file size limitations (15MB max for CSDS)
- Provides feedback on processed and skipped rows
- Client-side processing (no data is sent to any server)

## Input Format (MCL)
The tool expects a CSV file from Meta Content Library with the following required fields:
- surface.id (account identifier)
- id (content identifier)
- creation_time (post timestamp)
- text (post text content)
- link_attachment.link (link URL if present)

## Output Format (CSDS)
The tool generates a CSV file with the following columns:
- account_id: Unique ID of an account (from surface.id)
- content_id: Unique ID of account's posts (from id)
- object_id: Content identifier (either text or link_attachment.link)
- timestamp_share: UNIX timestamp of the post (converted from creation_time)

## Usage
1. Visit https://fabiogiglietto.github.io/mcl-csdc-preprocessor/
2. Choose whether to use text content or link as object_id
3. Upload your MCL CSV file
4. Download the transformed CSV file

## Development

Built with:
- React + TypeScript
- Vite
- TailwindCSS
- Papa Parse for CSV handling

## License

MIT License

## Author

Fabio Giglietto - [@fabiogiglietto](https://github.com/fabiogiglietto)
