import type { Config } from "@react-router/dev/config";
import { chapters, chapterPath } from "./app/content";
export default { ssr: false, prerender: chapters.map(chapter => chapterPath(chapter.id)) } satisfies Config;
