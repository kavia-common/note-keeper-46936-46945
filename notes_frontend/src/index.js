import Blits from '@lightningjs/blits'
import App from './App.js'

/**
 * Entry point: Launch Blits app into #app element.
 */
Blits.Launch(App, 'app', {
  w: 1920,
  h: 1080,
  debugLevel: 1,
})
