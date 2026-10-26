import React from "react";
import { useParams } from "react-router";
import { chapters, chapterPath } from "../content";
import { Manual } from "../components/Manual";
import NotFound from "./not-found";
export function meta({ params }: {params: Record<string, string | undefined>}) {
  const chapter = chapters.find(item => chapterPath(item.id) === (params.chapter ? "/" + params.chapter : "/"));
  if (!chapter) return [{title:"Page not found — Petal field guide"}];
  return [{title:chapter.title + " — Petal field guide"}, {name:"description",content:chapter.intro.replace(/<[^>]*>/g, "")}, {tagName:"link",rel:"canonical",href:"https://petal-user-manual-b5af91119565.herokuapp.com" + chapterPath(chapter.id)}];
}
export default function ChapterRoute() {
  const { chapter: slug } = useParams();
  const chapter = chapters.find(item => chapterPath(item.id) === (slug ? "/" + slug : "/"));
  return chapter ? <Manual chapter={chapter}/> : <NotFound/>;
}
