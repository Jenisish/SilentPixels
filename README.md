# SilentPixels - Masking Secrets in Mixed Media 🖼️🔒

A modern web application for hiding secret messages in images, videos, audio files, and documents using steganography techniques.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![App Preview](./src/public/weblog.jpg)

## Features ✨

- **Multi-Format Support**: Encode/decode messages in:
  - Images (PNG, JPG, GIF)
  - Videos (MP4, WebM)
  - Audio (MP3, WAV)
  - Documents (PDF, DOCX, TXT, etc.)
- **Secure Encryption**: Optional AES-256 encryption for hidden messages
- **User Authentication**: 
  - Email/password login
  - Social login (Google, Microsoft)
  - Password reset functionality
- **History Tracking**: View all encoding/decoding operations
- **Responsive UI**: Built with Tailwind CSS for optimal viewing experience

## Tech Stack 💻

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Build Tool**: Vite

## Installation 🛠️

1. Clone the repository:
```bash
git clone https://github.com/yourusername/silent-pixels.git
cd silent-pixels
```
Install dependencies:

```bash
npm install
```

Set up environment variables (create .env file):

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the development server:
```bash

npm run dev
```
Usage 🚀
```bash
Sign Up/Login:
Create an account or use social login
Securely reset password if needed
Encode Messages:
Select media type (image/video/audio/document)
Upload file
Enter secret message and optional encryption key
Download encoded file
Decode Messages:
Upload encoded file
Provide encryption key (if used)
View decoded message
View History:
Track all encode/decode operations
Filter by action type
Search by filename
```

License 📄
Distributed under the MIT License. See LICENSE for more information.
