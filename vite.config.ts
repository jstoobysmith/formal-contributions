import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import site from './config/site.json' with { type: 'json' };

const base = process.env.BASE_PATH ?? site.basePath;

/** Adds the favicon, touch icon and link-preview image named under "logo" in config/site.json to index.html. */
function logoTags(): Plugin {
  const local = (path: string) => `${base.replace(/\/?$/, '/')}${path}`;
  const { logo } = site;
  const tags: HtmlTagDescriptor[] = [
    { tag: 'link', attrs: { rel: 'icon', href: local(logo.faviconIco), sizes: '32x32' } },
    { tag: 'link', attrs: { rel: 'icon', href: local(logo.favicon), type: 'image/svg+xml' } },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: local(logo.appleTouchIcon) } },
    // Link previews need an absolute URL.
    { tag: 'meta', attrs: { property: 'og:image', content: `${site.siteUrl.replace(/\/$/, '')}/${logo.socialImage}` } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
  ];
  return { name: 'logo-tags', transformIndexHtml: () => tags };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), logoTags()],
});
