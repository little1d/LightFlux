import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const disableTenTapExpoProbe = () => ({
  enforce: 'pre' as const,
  name: 'disable-tentap-expo-probe',
  transform(code: string, id: string) {
    if (
      !id.includes('@10play/tentap-editor/lib-web/') ||
      !code.includes('expo-constants')
    ) {
      return null;
    }

    return code.replace(
      /require\((['"])expo-constants\1\)/g,
      'undefined',
    );
  },
});

export default defineConfig({
  root: 'editor-web',
  build: {
    emptyOutDir: true,
    outDir: 'build',
  },
  resolve: {
    alias: [
      {
        find: '@10play/tentap-editor',
        replacement: '@10play/tentap-editor/web',
      },
      {
        find: '@tiptap/pm/view',
        replacement: '@10play/tentap-editor/web',
      },
      {
        find: '@tiptap/pm/state',
        replacement: '@10play/tentap-editor/web',
      },
    ],
  },
  plugins: [disableTenTapExpoProbe(), react(), viteSingleFile()],
});
