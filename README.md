# WikiReplay

**Watch Wikipedia articles evolve through time.**

WikiReplay is an interactive visualization tool that lets you explore the complete edit history of any Wikipedia article. Scrub through revisions, watch content appear and disappear, and discover the story behind how articles evolved from their first edit to today.

![WikiReplay Screenshot](screenshot.png)

## Features

- 🎬 **Timeline Playback** - Play through article history automatically or scrub manually
- ✨ **Visual Diff Highlighting** - Additions in green, deletions in red with smooth transitions
- 📊 **Revision Metadata** - See editor info, timestamps, edit summaries, and tags
- 🌍 **Geolocation** - View approximate location for anonymous (IP-based) editors
- 🔍 **Article Search** - Search any Wikipedia article with autocomplete suggestions
- 📱 **Modern UI** - Clean, minimal interface built with accessibility in mind

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 with App Router
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Diffing**: [jsdiff](https://github.com/kpdecker/jsdiff)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sensahin/WikiReplay.git
   cd wikireplay
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Usage

1. **Search** - Type an article name in the search bar (e.g., "React (software)")
2. **Navigate** - Use the timeline slider or playback controls to move through revisions
3. **Explore** - Watch how the article changed over time with highlighted additions and deletions
4. **Learn** - Check the sidebar for revision details, editor info, and edit tags

## API Usage

WikiReplay uses the following public APIs:

- **Wikipedia API** - For fetching article revisions and content
- **ip-api.com** - For geolocation of anonymous editors (optional feature)

No API keys required. Please be mindful of rate limits when using the application.

## Disclaimer

This project is **not affiliated with, endorsed by, or connected to Wikipedia or the Wikimedia Foundation**. 

Wikipedia content is available under the [Creative Commons Attribution-ShareAlike License](https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License). This tool simply provides a different way to explore publicly available Wikipedia data through their official API.

"Wikipedia" is a registered trademark of the Wikimedia Foundation.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Wikipedia](https://www.wikipedia.org/) for providing open access to their incredible data
- [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) for making this possible
- All the Wikipedia editors who contribute to the world's largest encyclopedia

---

Made with ❤️ for Wikipedia enthusiasts everywhere