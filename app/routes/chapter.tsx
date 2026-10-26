import React from "react";
import { useParams } from "react-router";
import { chapters, chapterPath } from "../content";
import { Manual } from "../components/Manual";
import NotFound from "./not-found";
export function meta({ params }: {params: Record<string, string | undefined>}) {
  const chapter = chapters.find(item => chapterPath(item.id) === (params.chapter ? "/" + params.chapter : "/"));
  if (!chapter) return [{title:"Page not found — Petal field guide"}];
  const title = chapter.title + " — Petal field guide";
  const description = chapter.intro.replace(/<[^>]*>/g, "");
  const url = "https://petal.fm" + chapterPath(chapter.id);
  const image = "https://petal.fm/social-preview.png";
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Petal field guide" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: "Petal song timeline with colorful sections and a fixed playhead" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
}
export default function ChapterRoute() {
  const { chapter: slug } = useParams();
  const chapter = chapters.find(item => chapterPath(item.id) === (slug ? "/" + slug : "/"));
  return chapter ? <Manual chapter={chapter}/> : <NotFound/>;
}
