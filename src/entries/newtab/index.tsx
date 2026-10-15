import { render } from 'preact';
import '@/ui/styles/tokens.css';
import '@/ui/styles/base.css';
import { installPersistenceHooks } from '@/core/state/bootstrap';
import { App } from '@/ui/features/app/App';

/**
 * New tab page entry.
 *
 * Deliberately thin: `theme-boot.js` has already painted the cached theme, so
 * this module imports the stylesheets for their side effect and mounts the shell
 * in the same task. All hydration and subscription work belongs to `App`, which
 * keeps the first frame independent of `chrome.storage`.
 */
installPersistenceHooks();

const root = document.getElementById('marktab-root');

if (root) {
  render(<App />, root);
}
