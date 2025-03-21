# Show Me More

A modernized version of the classic Firefox addon "Show Me More" that helps you navigate through image sequences, record images you find interesting, and share collections of images.

## Features

- **Image Navigation**: Easily navigate through numbered image sequences with keyboard shortcuts or toolbar buttons.
- **Record Images**: Save images you like for later viewing. Hover over large images to quickly add them to your collection.
- **Show All**: View all images in a sequence at once, perfect for browsing through image galleries or comics.
- **Floating Navigation Panel**: Access previous/next/show-all buttons directly from any page without opening the popup.
- **Anti-Bot Detection**: Smart delays between image requests to avoid triggering website bot protections.
- **Stop Crawling**: Ability to stop the image crawling process at any point.
- **Share Collections**: Create and share links to your image collections with others.
- **Dark Mode Support**: Automatically switches to a dark theme when the browser is using dark mode.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/LAUVz/show-me-more-firefox.git
   cd show-me-more-firefox
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Building the Extension

To build the extension:

```
npm run build
```

This will compile TypeScript files, bundle them with webpack, and copy all necessary assets to the `dist` directory.

### Watching for Changes

To automatically rebuild when files change:

```
npm run watch
```

### Packaging the Extension

To create a distribution package:

```
npm run package
```

This will create a `.zip` file in the `packages` directory that can be submitted to the Firefox Add-ons store.

## Testing in Firefox

### Temporary Installation

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select any file in the `dist` directory

### Installation from Package

1. Open Firefox and navigate to `about:addons`
2. Click the gear icon and select "Install Add-on From File..."
3. Select the `.zip` file from the `packages` directory

## Usage

- Use keyboard shortcuts (Alt+Left/Right) or the toolbar buttons to navigate through image sequences
- Toggle recording mode in the popup to enable image recording
- Hover over large images while recording to see the add button
- Use "Show All" to view all images in a sequence
- View recorded images and create share links from the popup or toolbar

## Keyboard Shortcuts

- **Alt+Left**: Navigate to previous image in sequence
- **Alt+Right**: Navigate to next image in sequence
- **Alt+A**: Show all images in sequence
- **Alt+A+Left**: Show all previous images in sequence
- **Alt+A+Right**: Show all next images in sequence

## Project Structure

```
.
├── about/                 # About page
├── background/            # Background scripts
├── content/               # Content scripts and styles
├── gallery/               # Gallery page for showing all images
├── icons/                 # Extension icons and assets
├── popup/                 # Browser action popup
├── manifest.json          # Extension manifest
├── package.json           # npm package configuration
├── tsconfig.json          # TypeScript configuration
└── webpack.config.js      # Webpack configuration
```

## License

This project is open source software licensed under the MIT License.

## Credits

Henrijs Kons (LAUVz).
