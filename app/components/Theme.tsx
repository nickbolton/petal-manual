import React from "react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
const storageKey = "petal-manual-theme";
export const themeBootstrap = `(function(){try{var dark=localStorage.getItem("petal-manual-theme")==="dark";document.body.classList.toggle("dark",dark);document.querySelector('meta[name="theme-color"]').content=dark?"#111c21":"#f7f6f2";}catch(e){}})();`;
const ThemeContext = createContext({dark:false,toggleTheme:()=>{}});
export function ThemeProvider({children}: {children:ReactNode}) {
  const [dark,setDark]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{try{setDark(localStorage.getItem(storageKey)==="dark");}catch{}setReady(true);},[]);
  useEffect(()=>{
    if(!ready) return;
    document.body.classList.toggle("dark",dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",dark?"#111c21":"#f7f6f2");
  },[dark,ready]);
  const toggleTheme=()=>setDark(current=>{
    const next=!current;
    try{localStorage.setItem(storageKey,next?"dark":"light");}catch{}
    return next;
  });
  return <ThemeContext.Provider value={{dark,toggleTheme}}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
