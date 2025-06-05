import { attachFile, createOpenAPI } from 'fumadocs-openapi/server';

import { createMDXSource } from 'fumadocs-mdx';
import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';

export const openapi = createOpenAPI();

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(docs.docs),
  pageTree: {
    attachFile
  },
});